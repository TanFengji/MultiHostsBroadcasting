package main

import (
    "fmt"
    "encoding/json"
    "net"
    "bufio"
    "sync"
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


const (
    CONN_HOST = "localhost"
    CONN_PORT = "8888"
    CONN_TYPE = "tcp"
)

var rooms map[string]chan UserInfo
var openRoom chan (chan UserInfo)
var closeRoom chan (chan UserInfo)
var ins chan Instruction
var conn net.Conn
var connection *Connection

type Connection struct {
    sync.Mutex
    conn net.Conn
}

func (c *Connection) GetConnection() net.Conn {
    defer c.Unlock()
    c.Lock()
    return c.conn
}

func (c *Connection) SetConnection(newc net.Conn) {
    defer c.Unlock()
    c.Lock()
    c.conn = newc
}

func main() {
    // Listen for incoming connections.
    connection = new(Connection)
    listener, err := net.Listen(CONN_TYPE, CONN_HOST+":"+CONN_PORT)
    queue := make(chan UserInfo, 10) // Buffered channel with capacity of 10
    ins = make(chan Instruction, 10)
    rooms = make(map[string]chan UserInfo, 0)
    //rooms = make(map[string]Room)
    
    if err != nil {
	fmt.Println("Error listening:", err.Error())
    }
    
    // Close the listener when the application closes.
    defer listener.Close()
    
    for {
	// Listen for an incoming connection.
	conn, err := listener.Accept()
	connection.SetConnection(conn)
	
	if err != nil {
	    fmt.Println("Error accepting: ", err.Error())
	    continue
	}
	
	// Setup connections map
	fmt.Println("Connection established")
	
	// Handle connections in a new goroutine.
	go handleRequests(queue)
	go handleTasks(queue) // Potentially need to increase the number of workers
	go handleInstructions(ins)
    }
}

// Handles incoming requests and parse response from json to UserInfo struct
func handleRequests(queue chan<- UserInfo) {
    fmt.Println("handleRequests is working")
    conn := connection.GetConnection()
    defer conn.Close() 
    
    input := bufio.NewScanner(conn)
    var userInfo UserInfo
    
    for input.Scan() {
	text := input.Text()
	byte_text := []byte(text)
	err := json.Unmarshal(byte_text, &userInfo)
	if err != nil {
	    continue
	}
	queue <- userInfo // send userInfo to task queue
    }
    fmt.Println("Connection closed")
}


func handleTasks(queue <-chan UserInfo) {
    fmt.Println("handleTasks is working")
    
    for {
	userInfo := <- queue
	
	switch userInfo.Type {
	    case "newUser": newUserHandler(userInfo) 
	    case "host": newHostHandler(userInfo)
	    case "disconnectedUser": disconnectHandler(userInfo)
	}
	fmt.Printf("New task received -> Type: %s  User: %s  Room: %s\n", userInfo.Type, userInfo.User, userInfo.Room)
    }
}

func newUserHandler(userInfo UserInfo) {
    fmt.Println("newUserHandlerCalled")
    roomId := userInfo.Room
    if room, exist := rooms[roomId]; exist {
	room <- userInfo
    } else {
	fmt.Println("ERR: newUserHandler - room doesn't exist")
    }
    /* Send out instructions */
    /* TODO: may need to separate out this part */
    
    // host := room.getHost()
    //host := userInfo.Host
    //if host.Role == "host" { 
    //ins <- Instruction{Type:"newPeerConnection", Parent: host, Child: userInfo.User}
    //} else {
    //fmt.Println("ERR: Host doesn't exist")
    //}
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
    /*
     *	user := User{Name: userInfo.User, Role: "host"}
     *	users := make([]User, 0)
     *	users = append(users, user)
     *	room := Room{ID: roomId, Users: users}
     *	rooms[roomId] = room;
     *	fmt.Println(room.getUsers())
     *	ins <- Instruction{Type:"host", Host: user.Name}
     */
}

func disconnectHandler(userInfo UserInfo) {
    roomId := userInfo.Room
    if room, exist := rooms[roomId]; exist {
	room <- userInfo
	//room.removeUser(user)
	
	/* Send out instruction */
	//host := room.getHost()
	//host := userInfo.Host;
	
	//if host.Role == "host" {
	//ins <- Instruction{Type:"deletePeerConnection", Parent: host, Child: userInfo.User}
	//} else {
	//fmt.Println("ERR: Host doesn't exist")
	//}
	
	/*
	 *	if len(room.getUsers())==0 {
	 *	    delete(rooms, roomId)
    }
    */
	//fmt.Println(room.getUsers())
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
		fmt.Println("Currently ", graph.GetTotalNodes(), "users are in the room")
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
		newTree := graph.GetDCMST(1) // parameter is the constraint. 1 = traveling salesman, 2 means a hamitonian path problem aka maximum spanning binary tree 
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
	    case "closeRoom":
		return
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

func handleInstructions(ins <-chan Instruction) {
    conn := connection.GetConnection()
    fmt.Println("handleInstructions is working")
    for {
	instruction := <- ins
	str, err := json.Marshal(instruction)
	if err != nil {
	    fmt.Println("Error listening:", err.Error())
	    continue
	}
	fmt.Fprintf(conn, "%s\n", string(str))	// Refering to global variable
	// assuming one signal server
	fmt.Println("Instruction Sent")
    }
}
