# How to Build a WebSocket Chat App with Rooms in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, WebSocket, Chat, Real-time, Web Development

Description: Learn how to build a real-time chat application with multiple rooms in Go using the Gorilla WebSocket library, covering connection handling, broadcasting, and room management.

---

Building real-time applications is one of the most satisfying projects you can take on. There's something rewarding about seeing messages appear instantly across different browser tabs. Go is particularly well-suited for this because goroutines make handling thousands of concurrent WebSocket connections almost trivial. In this guide, we'll build a chat application with room support from scratch.

## Project Setup

First, create your project and install the Gorilla WebSocket library:

```bash
mkdir go-chat && cd go-chat
go mod init go-chat
go get github.com/gorilla/websocket
```

## The Core Architecture

Our chat app has three main components: a Hub that manages all connections and rooms, a Client that represents a single WebSocket connection, and a Room that groups clients together. Let's start with the data structures.

### Message Types

```go
// message.go
package main

// Message represents a chat message with room context
type Message struct {
    Type     string `json:"type"`     // "join", "leave", "message"
    Room     string `json:"room"`     // Target room name
    Username string `json:"username"` // Sender's display name
    Content  string `json:"content"`  // Message body
}
```

### The Client

Each WebSocket connection gets its own Client. The client handles reading from and writing to the WebSocket, and communicates with the Hub through channels.

```go
// client.go
package main

import (
    "encoding/json"
    "log"
    "time"

    "github.com/gorilla/websocket"
)

const (
    // Time allowed to write a message to the peer
    writeWait = 10 * time.Second

    // Time allowed to read the next pong message from the peer
    pongWait = 60 * time.Second

    // Send pings to peer with this period (must be less than pongWait)
    pingPeriod = (pongWait * 9) / 10

    // Maximum message size allowed from peer
    maxMessageSize = 512
)

// Client represents a single WebSocket connection
type Client struct {
    hub      *Hub
    conn     *websocket.Conn
    send     chan []byte  // Buffered channel for outbound messages
    room     string       // Current room the client is in
    username string       // Display name
}

// readPump pumps messages from the WebSocket to the hub
func (c *Client) readPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        _, data, err := c.conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("error: %v", err)
            }
            break
        }

        // Parse the incoming message
        var msg Message
        if err := json.Unmarshal(data, &msg); err != nil {
            log.Printf("error parsing message: %v", err)
            continue
        }

        msg.Username = c.username

        // Handle different message types
        switch msg.Type {
        case "join":
            c.hub.joinRoom <- &RoomRequest{client: c, room: msg.Room}
        case "leave":
            c.hub.leaveRoom <- &RoomRequest{client: c, room: msg.Room}
        case "message":
            if c.room != "" {
                msg.Room = c.room
                c.hub.broadcast <- &msg
            }
        }
    }
}

// writePump pumps messages from the hub to the WebSocket
func (c *Client) writePump() {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()

    for {
        select {
        case message, ok := <-c.send:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                // Hub closed the channel
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            w, err := c.conn.NextWriter(websocket.TextMessage)
            if err != nil {
                return
            }
            w.Write(message)

            // Drain any queued messages to reduce write calls
            n := len(c.send)
            for i := 0; i < n; i++ {
                w.Write([]byte{'\n'})
                w.Write(<-c.send)
            }

            if err := w.Close(); err != nil {
                return
            }

        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
```

### The Hub

The Hub is the central coordinator. It manages all connected clients, routes messages to the correct rooms, and handles room joins and leaves. Running everything through channels means we avoid locks and race conditions.

```go
// hub.go
package main

import (
    "encoding/json"
    "log"
)

// RoomRequest represents a request to join or leave a room
type RoomRequest struct {
    client *Client
    room   string
}

// Hub maintains active clients and broadcasts messages to rooms
type Hub struct {
    // All connected clients
    clients map[*Client]bool

    // Room name to clients mapping
    rooms map[string]map[*Client]bool

    // Inbound messages to broadcast
    broadcast chan *Message

    // Register requests from clients
    register chan *Client

    // Unregister requests from clients
    unregister chan *Client

    // Join room requests
    joinRoom chan *RoomRequest

    // Leave room requests
    leaveRoom chan *RoomRequest
}

func newHub() *Hub {
    return &Hub{
        broadcast:  make(chan *Message),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        joinRoom:   make(chan *RoomRequest),
        leaveRoom:  make(chan *RoomRequest),
        clients:    make(map[*Client]bool),
        rooms:      make(map[string]map[*Client]bool),
    }
}

func (h *Hub) run() {
    for {
        select {
        case client := <-h.register:
            h.clients[client] = true
            log.Printf("Client connected: %s", client.username)

        case client := <-h.unregister:
            if _, ok := h.clients[client]; ok {
                // Remove from current room if in one
                if client.room != "" {
                    h.removeFromRoom(client, client.room)
                }
                delete(h.clients, client)
                close(client.send)
                log.Printf("Client disconnected: %s", client.username)
            }

        case req := <-h.joinRoom:
            h.handleJoinRoom(req.client, req.room)

        case req := <-h.leaveRoom:
            h.removeFromRoom(req.client, req.room)

        case msg := <-h.broadcast:
            h.broadcastToRoom(msg)
        }
    }
}

func (h *Hub) handleJoinRoom(client *Client, room string) {
    // Leave current room if in one
    if client.room != "" {
        h.removeFromRoom(client, client.room)
    }

    // Create room if it doesn't exist
    if h.rooms[room] == nil {
        h.rooms[room] = make(map[*Client]bool)
        log.Printf("Room created: %s", room)
    }

    // Add client to room
    h.rooms[room][client] = true
    client.room = room
    log.Printf("%s joined room: %s", client.username, room)

    // Notify room members
    joinMsg := &Message{
        Type:     "join",
        Room:     room,
        Username: client.username,
        Content:  client.username + " joined the room",
    }
    h.broadcastToRoom(joinMsg)
}

func (h *Hub) removeFromRoom(client *Client, room string) {
    if clients, ok := h.rooms[room]; ok {
        if _, ok := clients[client]; ok {
            delete(clients, client)

            // Notify room about departure
            leaveMsg := &Message{
                Type:     "leave",
                Room:     room,
                Username: client.username,
                Content:  client.username + " left the room",
            }
            h.broadcastToRoom(leaveMsg)

            // Clean up empty rooms
            if len(clients) == 0 {
                delete(h.rooms, room)
                log.Printf("Room deleted: %s", room)
            }

            client.room = ""
            log.Printf("%s left room: %s", client.username, room)
        }
    }
}

func (h *Hub) broadcastToRoom(msg *Message) {
    clients, ok := h.rooms[msg.Room]
    if !ok {
        return
    }

    data, err := json.Marshal(msg)
    if err != nil {
        log.Printf("error marshaling message: %v", err)
        return
    }

    for client := range clients {
        select {
        case client.send <- data:
            // Message sent successfully
        default:
            // Client buffer full, disconnect them
            close(client.send)
            delete(clients, client)
            delete(h.clients, client)
        }
    }
}
```

### The HTTP Handler

Now we need an HTTP handler to upgrade connections to WebSocket:

```go
// main.go
package main

import (
    "log"
    "net/http"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    // Allow all origins for development - restrict this in production
    CheckOrigin: func(r *http.Request) bool {
        return true
    },
}

func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
    // Get username from query parameter
    username := r.URL.Query().Get("username")
    if username == "" {
        username = "anonymous"
    }

    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println(err)
        return
    }

    client := &Client{
        hub:      hub,
        conn:     conn,
        send:     make(chan []byte, 256),
        username: username,
    }
    client.hub.register <- client

    // Start read and write pumps in separate goroutines
    go client.writePump()
    go client.readPump()
}

func main() {
    hub := newHub()
    go hub.run()

    http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
        serveWs(hub, w, r)
    })

    // Serve static files for the frontend
    http.Handle("/", http.FileServer(http.Dir("./static")))

    log.Println("Server starting on :8080")
    err := http.ListenAndServe(":8080", nil)
    if err != nil {
        log.Fatal("ListenAndServe: ", err)
    }
}
```

## A Simple Frontend

Create a `static` folder and add an `index.html` file:

```html
<!DOCTYPE html>
<html>
<head>
    <title>Go Chat</title>
    <style>
        #messages { height: 300px; overflow-y: scroll; border: 1px solid #ccc; padding: 10px; }
        .system { color: #888; font-style: italic; }
    </style>
</head>
<body>
    <h1>Go Chat with Rooms</h1>
    <div>
        <input type="text" id="username" placeholder="Username">
        <button onclick="connect()">Connect</button>
    </div>
    <div>
        <input type="text" id="room" placeholder="Room name">
        <button onclick="joinRoom()">Join Room</button>
    </div>
    <div id="messages"></div>
    <div>
        <input type="text" id="message" placeholder="Message" onkeypress="if(event.key==='Enter')sendMessage()">
        <button onclick="sendMessage()">Send</button>
    </div>

    <script>
        let ws;

        function connect() {
            const username = document.getElementById('username').value || 'anonymous';
            ws = new WebSocket(`ws://localhost:8080/ws?username=${username}`);

            ws.onmessage = function(event) {
                const msg = JSON.parse(event.data);
                const div = document.createElement('div');
                if (msg.type === 'join' || msg.type === 'leave') {
                    div.className = 'system';
                    div.textContent = msg.content;
                } else {
                    div.textContent = `${msg.username}: ${msg.content}`;
                }
                document.getElementById('messages').appendChild(div);
            };
        }

        function joinRoom() {
            const room = document.getElementById('room').value;
            ws.send(JSON.stringify({type: 'join', room: room}));
        }

        function sendMessage() {
            const content = document.getElementById('message').value;
            ws.send(JSON.stringify({type: 'message', content: content}));
            document.getElementById('message').value = '';
        }
    </script>
</body>
</html>
```

## Running the Application

Start the server:

```bash
go run .
```

Open `http://localhost:8080` in multiple browser tabs. Enter different usernames, join the same room, and start chatting. Messages appear instantly across all connected clients in that room.

## Production Considerations

Before deploying this to production, you'll want to add a few things:

**Authentication**: Validate usernames against your auth system instead of accepting query parameters. Use JWTs or session cookies.

**Message persistence**: Store messages in a database so users can see chat history when they join a room. Redis works well for recent messages, with PostgreSQL for long-term storage.

**Scaling horizontally**: A single server can handle thousands of connections, but eventually you'll need multiple servers. Use Redis pub/sub to broadcast messages across server instances.

**Rate limiting**: Prevent spam by limiting how many messages a client can send per minute. Track message counts per client and disconnect abusers.

**Graceful shutdown**: Handle SIGTERM by notifying connected clients and closing connections cleanly before the server exits.

## Wrapping Up

Go's concurrency model makes WebSocket servers straightforward to build. The channel-based communication between the Hub and Clients eliminates most concurrency bugs you'd encounter with locks. Goroutines handle each connection independently, and the Hub coordinates everything through a single event loop.

The code we built handles the core functionality - connections, rooms, and broadcasting. From here, you can add features like private messages, typing indicators, file sharing, or message reactions. The architecture scales well because each new feature just adds another message type and handler.
