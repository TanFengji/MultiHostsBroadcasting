package main

type Node struct {
    Value string
    edges map[string]Edge
}

type Edge struct {
    Parent, Child Node
    Weight int
}

// @PASSED
func (n *Node) AddEdge(e Edge) {
    //n.edges = append(n.edges, e)
    // TODO: Add error handling
    child := e.Child.Value
    n.edges[child] = e
}

// @PASSED
// RemoveEdge function removes an edge from a given node
func (n *Node) RemoveEdge(e Edge) {
    // TODO: Need a better implementation
    // In the next iteration consider change edges to dictionary
    /*
    for i, ne := range n.edges {
	if ne.Parent.Value == e.Parent.Value && ne.Child.Value == e.Child.Value {
	    n.edges = append(n.edges[:i], n.edges[i+1:]...)
	}
    }
    */
    // A dictionary implementation
    delete(n.edges, e.Child.Value)
}
// @PASSED
// GetEdges returns all edges that are incident from a given node. Note that
// the incoming edges to the node are not included in the returned results
func (n *Node) GetEdges() []Edge {
    edges := make([]Edge, 0, 100)
    for _, e := range n.edges {
	edges = append(edges, e)
    }
    return edges
}

// @PASSED
func NewNode(val string) *Node {
    var n Node
    n.Value = val
    n.edges = make(map[string]Edge)
    return &n
}

// HasNode function tells if a specific edge has a specific node associated 
// with it
func (e *Edge) HasNode(val string) bool {
    if e.Parent.Value == val || e.Child.Value == val {
	return true
    }
    return false
}
