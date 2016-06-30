package main

// Currently not used. Maybe useful in the future

type Room struct {
    ID string `json:"roomID"`
    Users []User `json:"users"`
}

func (room *Room) addUser(user User) {
    room.Users = append(room.Users, user)
}

func (room *Room) getUsers() []User {
    return room.Users
}

func (room *Room) removeUser(user User) {
    for i, u := range room.Users {
	if u.Name == user.Name {
	    room.Users = append(room.Users[:i], room.Users[i+1:]...) // The ... is essential
	    return
	}
    }
}

func (room *Room) getHost() User {
    users := room.getUsers()
    for _, u := range users {
	if u.Role == "host" {
	    return u
	}
    }
    return User{}
}