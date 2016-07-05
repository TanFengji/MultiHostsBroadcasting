package main

import "fmt"

func main () {
    // Test graph.go
    graph := NewGraph()
    graph.AddNode("a")
    graph.AddNode("b")
    graph.AddNode("c")
    graph.AddNode("d")
    graph.AddNode("e")
    
    graph.AddUniEdge("a", "b", 1)
    graph.AddUniEdge("a", "c", 1)
    graph.AddUniEdge("a", "d", 1)
    graph.AddUniEdge("d", "c", 1)
    graph.AddUniEdge("b", "c", 1)
    graph.AddUniEdge("d", "e", 1)
    graph.AddUniEdge("c", "e", 1)
    
    graph.SetHead("a")
    h, _ := graph.GetHead()
    fmt.Println(h.Value) 			// a
    fmt.Println(graph.GetTotalNodes())		// 5
    
    fmt.Println(graph.HasUniEdge("d", "c")) 	// true
    graph.RemoveUniEdge("d", "c") 	
    fmt.Println(graph.HasUniEdge("d", "c"))	// false
    fmt.Println(graph.HasUniEdge("a", "d"))	// true
    fmt.Println(graph.HasUniEdge("d", "e"))	// true
    graph.RemoveNode("d")
    fmt.Println(graph.HasUniEdge("a", "d"))	// false
    fmt.Println(graph.HasUniEdge("d", "e"))	// false
    fmt.Println(graph.GetTotalNodes())		// 4
    a := graph.GetNode("a")
    edges := a.GetEdges()
    fmt.Println(len(edges))			// 2
    fmt.Println(graph.HasUniEdge("d", "e"))	// false
    
    fmt.Println("====")
    ps := graph.GetParent("c")
    for _, p := range ps {
	fmt.Println(p.Value)			// [a b]
    }
    
    fmt.Println("====")
    cs := graph.GetChildren("a")
    for _, c := range cs {
	fmt.Println(c.Value)			// [b c]
    }
    
    fmt.Println("====")
    cs = graph.GetChildren("c")
    for _, c := range cs {
	fmt.Println(c.Value)			// [e]
    }
    
    fmt.Println(graph.HasHead())		// true
    graph.RemoveHead()
    fmt.Println(graph.HasHead())		// false
    _, err := graph.GetHead()
    if err != nil {
	fmt.Println(err)			// Head not found
    }
    graph.SetHead("a")
    fmt.Println(graph.HasHead())		// true
    n, err := graph.GetHead()
    if err != nil {
	fmt.Println(err)			
    }
    fmt.Println(n.Value)			// a
    
    // Test DCMST
    /*
    fmt.Println("=========================")
    fmt.Println("[DEBUG] START")
    graph.Print()
    g1 := graph.GetDCMST(1)
    g1.Print()
    
    graph.AddNode("d")
    graph.AddUniEdge("a", "d", 1)
    graph.AddUniEdge("d", "c", 1)
    graph.AddUniEdge("d", "e", 1)
    
    fmt.Println("========================")
    fmt.Println("[DEBUG] START")
    graph.Print()
    g2 := graph.GetDCMST(1)
    g2.Print()
    
    as, rs := g2.Compare(g1)
    fmt.Printf("[ADD]")
    for _, e := range as {
	fmt.Printf("%v -> %v ", e.Parent.Value, e.Child.Value)
    }
    fmt.Printf("\n")
    fmt.Printf("[REMOVED]")
    for _, e := range rs {
	fmt.Printf("%v -> %v ", e.Parent.Value, e.Child.Value)
    }
    fmt.Printf("\n")
    */
    
} 
