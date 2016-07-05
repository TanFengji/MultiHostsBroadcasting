package main

import (
    "fmt"
    "encoding/json"
    "github.com/googollee/go-socket.io"
    "net/http"
    "log"
)

type PeerInfo struct {
    Peer string `json:"peer"`
    Latency int `json:"latency"`
}

type UserInfo struct {
    Type string `json:"type" `
    User string `json:"user" `
    Room string `json:"room" `
    Host string `json:"host" `
    Latency []PeerInfo `json:"latency"`
}

type Instruction struct {
    Type string `json:"type"` //enum: "newPeerConnection" "deletePeerConnection"
    Parent string `json:"parent"`
    Child string `json:"child"` 
    Host string `json:"host"`
}

var rooms map[string]chan UserInfo
var openRoom chan (chan UserInfo)
var closeRoom chan (chan UserInfo)
var ins chan Instruction

func main() {
    // Listen for incoming connections.
    ins = make(chan Instruction, 10)
    rooms = make(map[string]chan UserInfo, 0)
    
    server, err := socketio.NewServer(nil)
    
    if err != nil {
        log.Fatal(err)
    }
    
    server.On("connection", func(so socketio.Socket) {
	fmt.Println("Connection established")
	
        so.On("host", func(data string) {
	    var userInfo UserInfo
	    byte_text := []byte(data)
	    err := json.Unmarshal(byte_text, &userInfo)
	    if err != nil {
		log.Fatal(err)
	    }
	    newHostHandler(userInfo) // send userInfo to task queue   
	})
	
	so.On("newUser", func(data string) {
	    var userInfo UserInfo
	    byte_text := []byte(data)
	    err := json.Unmarshal(byte_text, &userInfo)
	    if err != nil {
		log.Fatal(err)
	    }
	    newUserHandler(userInfo) // send userInfo to task queue   ewUserHandler(userInfo) // send userInfo to task queue   
	    
	})
	
	so.On("disconnectedUser", func(data string) {
	    var userInfo UserInfo
	    byte_text := []byte(data)
	    err := json.Unmarshal(byte_text, &userInfo)
	    if err != nil {
		log.Fatal(err)
	    }
	    disconnectHandler(userInfo) // send userInfo to task queue   ewUserHandler(userInfo) // send userInfo to task queue   
	})
	
	so.On("disconnection", func() {
	    fmt.Println("Connection closed")
	})
	
	// Start a goroutine to handle instructions
	go func(so socketio.Socket) {
	    for instruction := range ins {
		str, err := json.Marshal(instruction)
		if err != nil {
		    fmt.Println("Error listening:", err.Error())
		    continue
		}
		// assuming one signal server
		//fmt.Println(string(str))
		fmt.Println("Instruction Sent")
		so.Emit("data", string(str)) 
	    }
	}(so)
    })
    
    server.On("error", func(so socketio.Socket, err error) {
	log.Println("error:", err)
    })
    
    http.Handle("/", server)
    log.Println("Serving route on localhost:8888...")
    log.Fatal(http.ListenAndServe(":8888", nil))
    
    
    // Setup connections map
    fmt.Println("Connection established")
}

func newUserHandler(userInfo UserInfo) {
    fmt.Println("newUserHandlerCalled")
    roomId := userInfo.Room
    if room, exist := rooms[roomId]; exist {
	room <- userInfo
    } else {
	fmt.Println("ERR: newUserHandler - room doesn't exist")
    }
}

func newHostHandler(userInfo UserInfo) {
    fmt.Println("newHostHandlerCalled")
    roomId := userInfo.Room
    if _, exist := rooms[roomId]; !exist {
	room := make(chan UserInfo)
	rooms[roomId] = room
	go manageRoom(room)
	// openRoom <- room
	room <- userInfo
	//ins <- Instruction{Type:"host", Host: userInfo.User}
    } else {
	fmt.Println("ERR: newHostHandler - room already exists")
    }
}

func disconnectHandler(userInfo UserInfo) {
    roomId := userInfo.Room
    if room, exist := rooms[roomId]; exist {
	room <- userInfo
   } else {
	fmt.Println("ERR: disconnectHandler - disconnecting from a room non-existing")
   }
}

func manageRoom(room chan UserInfo) {
    defer close(room)
    
    var graph = NewGraph() // TODO: implement Graph
    var tree = NewGraph()
    var roomId string
    
    for {
	userInfo := <- room
	//fmt.Printf("[DEBUG] %v\n", userInfo.Host)
	roomId = userInfo.Room
	
	switch userInfo.Type {
	    case "host": 
		username := userInfo.User
		graph.AddNode(username)
		graph.SetHead(username)
		fmt.Println("New Room", roomId, "is created")
		// fmt.Println("Currently ", graph.GetTotalNodes(), "users are in the room")
		ins <- Instruction{Type: "startBroadcasting", Host: username} 
		
		if userInfo.Latency != nil { // may be unnecessary
		    for _, p := range userInfo.Latency {
			peername := p.Peer
			weight := p.Latency
			graph.AddUniEdge(peername, username, weight)
		    }
		}
		
	    case "newUser": 
		username := userInfo.User
		graph.AddNode(username)
		for _, p := range userInfo.Latency {
		    peername := p.Peer
		    weight := p.Latency
		    graph.AddUniEdge(peername, username, weight)
		}
		
		// Get DCMST and send instructions, assuming the host already exists
		newTree := graph.GetDCMST(2) // parameter is the constraint. 1 = traveling salesman, 2 means a hamitonian path problem aka maximum spanning binary tree 
		newTree.Print()
		
		addedEdges, removedEdges := newTree.Compare(tree)  // addedEdges, removedEdges := graph.Compare(tree, newTree) 
		
		host := newTree.GetHead().Value
		for _, edge := range removedEdges {
		    ins <- Instruction{Type:"stopForwarding", Parent: edge.Parent.Value, Child: edge.Child.Value, Host:host}
		}
		
		for _, edge := range addedEdges { // assuming addedEdges are sorted in good orders 
		    ins <- Instruction{Type:"startForwarding", Parent: edge.Parent.Value, Child: edge.Child.Value, Host:host}
		}
		
		tree = newTree
		
	    case "disconnectedUser": 
		username := userInfo.User
		graph.RemoveNode(username)
		// The following case is not captured by the loop below -> This is artifect
		
		/* Avoid sending unnecessary instruction because the user already disconnect
		 * and there is no need to send this instruction again 
		 * if graph.GetTotalNodes() <= 1 {
		 *	   i ns* <- Instruction{Type:"deletePeerConnection", Parent: userInfo.Host, Child: userInfo.User, Host: userInfo.Host}
		 * }
		 */
		
		// Get DCMST and send instructions, assuming the host already exists
		newTree := graph.GetDCMST(1) // parameter is the constraint. 1 = traveling salesman, 2 means a hamitonian path problem aka maximum spanning binary tree 
		newTree.Print()
		
		addedEdges, removedEdges := newTree.Compare(tree)  // addedEdges, removedEdges := graph.Compare(tree, newTree) 
		
		host := newTree.GetHead().Value
		for _, edge := range removedEdges {
		    // Remove edges associated with the disconnected user to avoid unnecessary instructions
		    // since the user is already disconnected, there is no need for further instructions
		    if !edge.HasNode(username) {
			ins <- Instruction{Type:"stopForwarding", Parent: edge.Parent.Value, Child: edge.Child.Value, Host:host}
		    }
		}
		
		for _, edge := range addedEdges { // assuming addedEdges are sorted in good orders 
		    // Added edges will not have any information about disconnected user so it's safe
		    ins <- Instruction{Type:"startForwarding", Parent: edge.Parent.Value, Child: edge.Child.Value, Host:host}
		}
		
		tree = newTree
		
		
		/* close room signal, it is not used at the moment
		 *	 c **ase "closeRoom":
		 *	 return
		 */
	}
	
	// Close the room when no one is left in the room
	if graph.GetTotalNodes() == 0 {
	    delete(rooms, roomId)
	    fmt.Println("Closing room", roomId)
	    return
	}
    }
}