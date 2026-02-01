# How to Build WebSocket Servers with Gorilla WebSocket

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, WebSocket, Gorilla, Real-time, Networking

Description: A practical guide to building WebSocket servers in Go using the Gorilla WebSocket library for real-time communication.

---

WebSockets have become the backbone of real-time applications. Chat apps, live dashboards, multiplayer games, collaborative editors - they all rely on persistent, bidirectional connections. If you're building something like this in Go, Gorilla WebSocket is the library you want.

This guide walks through building a production-ready WebSocket server. We'll cover everything from basic setup to connection management, broadcasting, and graceful shutdown. By the end, you'll have a solid foundation for any real-time application.

## Why Gorilla WebSocket?

Go's standard library has basic WebSocket support through `golang.org/x/net/websocket`, but it's limited. Gorilla WebSocket offers better performance, cleaner APIs, and features you actually need in production - like control over read/write buffers, proper ping/pong handling, and compression support.

The library is battle-tested and used by companies running WebSocket connections at scale. It's also well-maintained and follows Go idioms closely.

## Setting Up Your Project

First, create a new Go module and install Gorilla WebSocket:

```bash
mkdir websocket-server && cd websocket-server
go mod init websocket-server
go get github.com/gorilla/websocket
```

## The Upgrader - Your Gateway to WebSockets

HTTP connections need to be "upgraded" to WebSocket connections. The upgrader handles this handshake process and lets you configure important parameters.

Here's a basic upgrader setup with sensible defaults:

```go
package main

import (
    "log"
    "net/http"
    "time"

    "github.com/gorilla/websocket"
)

// Configure the upgrader with production-ready settings
var upgrader = websocket.Upgrader{
    // ReadBufferSize and WriteBufferSize specify the buffer sizes for reads and writes.
    // 1024 bytes is reasonable for most applications. Increase for high-throughput scenarios.
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,

    // CheckOrigin validates the request origin. In production, implement proper validation.
    // This permissive setting is only for development.
    CheckOrigin: func(r *http.Request) bool {
        // TODO: In production, check against allowed origins
        // allowedOrigins := []string{"https://yourdomain.com"}
        // origin := r.Header.Get("Origin")
        // return slices.Contains(allowedOrigins, origin)
        return true
    },

    // EnableCompression reduces bandwidth at the cost of CPU.
    // Enable for text-heavy applications, disable for high-frequency updates.
    EnableCompression: true,
}
```

The `CheckOrigin` function is critical for security. In production, never use `return true` without validating the origin against your allowed domains.

## Handling Connections

When a client connects, you upgrade the HTTP connection and then manage reading and writing in separate goroutines. This pattern is standard for WebSocket servers.

Let's build a connection handler:

```go
// Client represents a single WebSocket connection
type Client struct {
    conn *websocket.Conn
    send chan []byte
}

// handleWebSocket upgrades HTTP connections and manages the WebSocket lifecycle
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    // Upgrade the HTTP connection to WebSocket
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Failed to upgrade connection: %v", err)
        return
    }

    // Create a new client with a buffered send channel
    // Buffer size of 256 prevents slow clients from blocking broadcasts
    client := &Client{
        conn: conn,
        send: make(chan []byte, 256),
    }

    // Register the client with our hub (we'll build this next)
    hub.register <- client

    // Start the read and write pumps in separate goroutines
    // These handle all communication with this specific client
    go client.writePump()
    go client.readPump()
}
```

## Read and Write Pumps

The read pump handles incoming messages from the client. The write pump handles outgoing messages. Separating these concerns makes the code cleaner and allows proper timeout handling.

```go
const (
    // Time allowed to write a message to the client
    writeWait = 10 * time.Second

    // Time allowed to read the next pong message from the client
    pongWait = 60 * time.Second

    // Send pings to client with this period - must be less than pongWait
    pingPeriod = (pongWait * 9) / 10

    // Maximum message size allowed from client - prevents memory exhaustion attacks
    maxMessageSize = 512 * 1024 // 512KB
)

// readPump reads messages from the WebSocket connection
func (c *Client) readPump() {
    // Ensure cleanup happens when this goroutine exits
    defer func() {
        hub.unregister <- c
        c.conn.Close()
    }()

    // Configure connection limits
    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))

    // Reset the read deadline every time we receive a pong
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    // Main read loop
    for {
        _, message, err := c.conn.ReadMessage()
        if err != nil {
            // Check if this is a normal close
            if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
                log.Printf("Unexpected close error: %v", err)
            }
            break
        }

        // Process the message - in this example, we broadcast to all clients
        hub.broadcast <- message
    }
}

// writePump sends messages to the WebSocket connection
func (c *Client) writePump() {
    // Create a ticker for sending periodic pings
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        c.conn.Close()
    }()

    for {
        select {
        case message, ok := <-c.send:
            // Set write deadline for every write operation
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))

            if !ok {
                // The hub closed the channel - send close message
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            // Get a writer for the next message
            w, err := c.conn.NextWriter(websocket.TextMessage)
            if err != nil {
                return
            }
            w.Write(message)

            // Batch any queued messages into the same WebSocket frame
            // This improves performance when messages arrive faster than we send
            n := len(c.send)
            for i := 0; i < n; i++ {
                w.Write([]byte{'\n'})
                w.Write(<-c.send)
            }

            if err := w.Close(); err != nil {
                return
            }

        case <-ticker.C:
            // Send periodic ping to keep connection alive
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
```

## The Hub - Managing All Connections

The hub is the central coordinator. It tracks all active connections and handles broadcasting messages to multiple clients. Using channels for registration and broadcasting keeps the code thread-safe without explicit locking.

```go
// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
    // Registered clients - using a map for O(1) lookups
    clients map[*Client]bool

    // Inbound messages from clients to broadcast
    broadcast chan []byte

    // Register requests from new clients
    register chan *Client

    // Unregister requests from disconnecting clients
    unregister chan *Client
}

// newHub creates a new Hub instance
func newHub() *Hub {
    return &Hub{
        broadcast:  make(chan []byte),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        clients:    make(map[*Client]bool),
    }
}

// run starts the hub's main loop - call this in a goroutine
func (h *Hub) run() {
    for {
        select {
        case client := <-h.register:
            // Add new client to the map
            h.clients[client] = true
            log.Printf("Client connected. Total clients: %d", len(h.clients))

        case client := <-h.unregister:
            // Remove client if it exists
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
                log.Printf("Client disconnected. Total clients: %d", len(h.clients))
            }

        case message := <-h.broadcast:
            // Send message to all connected clients
            for client := range h.clients {
                select {
                case client.send <- message:
                    // Message queued successfully
                default:
                    // Client's send buffer is full - assume it's dead
                    close(client.send)
                    delete(h.clients, client)
                }
            }
        }
    }
}
```

The non-blocking send with `select` and `default` is important. If a client can't keep up with messages, their buffer fills up. Rather than blocking the entire broadcast, we disconnect slow clients. This keeps the server responsive even when some clients have network issues.

## Ping/Pong - Keeping Connections Alive

WebSocket connections can silently die. Network issues, load balancers timing out, or clients closing their laptops - you won't know unless you actively check. Ping/pong frames solve this.

We already set up ping/pong in the read and write pumps. Here's what's happening:

1. The write pump sends a ping every 54 seconds (9/10 of the 60-second pong timeout)
2. The client automatically responds with a pong (browsers handle this)
3. The pong handler in the read pump resets the read deadline
4. If no pong arrives within 60 seconds, the read deadline expires and the connection closes

This sequence ensures dead connections get cleaned up within a minute, even if the client disappears without sending a close frame.

## Graceful Shutdown

Production servers need to shut down cleanly. This means closing all WebSocket connections properly and letting in-flight messages complete.

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"
)

var hub *Hub

func main() {
    // Create and start the hub
    hub = newHub()
    go hub.run()

    // Set up HTTP routes
    http.HandleFunc("/ws", handleWebSocket)

    // Create the HTTP server with timeouts
    server := &http.Server{
        Addr:         ":8080",
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
    }

    // Start server in a goroutine so we can handle shutdown
    go func() {
        log.Printf("WebSocket server starting on :8080")
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    // Wait for interrupt signal
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down server...")

    // Create a deadline for shutdown
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Close all WebSocket connections gracefully
    for client := range hub.clients {
        // Send close message to each client
        client.conn.WriteMessage(websocket.CloseMessage,
            websocket.FormatCloseMessage(websocket.CloseNormalClosure, "Server shutting down"))
        client.conn.Close()
    }

    // Shutdown HTTP server
    if err := server.Shutdown(ctx); err != nil {
        log.Printf("Server shutdown error: %v", err)
    }

    log.Println("Server stopped")
}
```

## Connection Management Patterns

Real applications need more than basic broadcasting. Here are patterns you'll commonly need:

### Room-Based Messaging

Group clients into rooms for targeted messaging:

```go
// Hub with room support
type RoomHub struct {
    rooms map[string]map[*Client]bool
    mu    sync.RWMutex
}

// JoinRoom adds a client to a room
func (h *RoomHub) JoinRoom(roomID string, client *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()

    if h.rooms[roomID] == nil {
        h.rooms[roomID] = make(map[*Client]bool)
    }
    h.rooms[roomID][client] = true
}

// BroadcastToRoom sends a message to all clients in a room
func (h *RoomHub) BroadcastToRoom(roomID string, message []byte) {
    h.mu.RLock()
    defer h.mu.RUnlock()

    if clients, ok := h.rooms[roomID]; ok {
        for client := range clients {
            select {
            case client.send <- message:
            default:
                // Handle slow client
            }
        }
    }
}
```

### Client Identification

Associate metadata with connections:

```go
// Client with identity
type Client struct {
    conn   *websocket.Conn
    send   chan []byte
    userID string
    rooms  []string
}

// Authenticate during connection setup
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    // Extract auth token from query params or headers
    token := r.URL.Query().Get("token")
    userID, err := validateToken(token)
    if err != nil {
        http.Error(w, "Unauthorized", http.StatusUnauthorized)
        return
    }

    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        return
    }

    client := &Client{
        conn:   conn,
        send:   make(chan []byte, 256),
        userID: userID,
    }

    // Now you can route messages to specific users
    hub.register <- client
    go client.writePump()
    go client.readPump()
}
```

## Error Handling and Logging

Good error handling makes debugging production issues much easier:

```go
// Enhanced read pump with structured error handling
func (c *Client) readPump() {
    defer func() {
        hub.unregister <- c
        c.conn.Close()
    }()

    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        messageType, message, err := c.conn.ReadMessage()
        if err != nil {
            // Categorize the error for proper handling
            if websocket.IsCloseError(err, websocket.CloseNormalClosure, websocket.CloseGoingAway) {
                log.Printf("Client %s closed connection normally", c.userID)
            } else if websocket.IsUnexpectedCloseError(err) {
                log.Printf("Client %s unexpected close: %v", c.userID, err)
            } else {
                log.Printf("Client %s read error: %v", c.userID, err)
            }
            return
        }

        // Log message details for debugging - be careful with sensitive data
        log.Printf("Received message type %d, length %d from %s",
            messageType, len(message), c.userID)

        hub.broadcast <- message
    }
}
```

## Performance Considerations

A few things to keep in mind when scaling:

1. **Buffer sizes matter** - Larger buffers use more memory but handle bursts better. Profile your actual traffic patterns.

2. **Compression trades CPU for bandwidth** - Enable it for text-heavy workloads over slow networks. Disable for low-latency requirements.

3. **Message batching** - We batch queued messages in the write pump. This reduces syscalls and improves throughput.

4. **Connection limits** - Set `maxMessageSize` to prevent memory exhaustion. Consider limiting total connections per server.

5. **Load balancing** - WebSocket connections are sticky. Use consistent hashing or dedicated WebSocket servers behind your load balancer.

## Putting It All Together

Here's the complete, runnable server:

```go
package main

import (
    "context"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/gorilla/websocket"
)

const (
    writeWait      = 10 * time.Second
    pongWait       = 60 * time.Second
    pingPeriod     = (pongWait * 9) / 10
    maxMessageSize = 512 * 1024
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:    1024,
    WriteBufferSize:   1024,
    CheckOrigin:       func(r *http.Request) bool { return true },
    EnableCompression: true,
}

var hub *Hub

func main() {
    hub = newHub()
    go hub.run()

    http.HandleFunc("/ws", handleWebSocket)

    server := &http.Server{
        Addr:         ":8080",
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
    }

    go func() {
        log.Printf("WebSocket server starting on :8080")
        if err := server.ListenAndServe(); err != http.ErrServerClosed {
            log.Fatalf("Server error: %v", err)
        }
    }()

    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit

    log.Println("Shutting down...")
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    for client := range hub.clients {
        client.conn.WriteMessage(websocket.CloseMessage,
            websocket.FormatCloseMessage(websocket.CloseNormalClosure, ""))
        client.conn.Close()
    }

    server.Shutdown(ctx)
    log.Println("Server stopped")
}
```

Run it with `go run .` and connect using any WebSocket client. Messages sent by any client will broadcast to all connected clients.

## Wrapping Up

Gorilla WebSocket gives you the tools to build robust real-time applications in Go. The patterns covered here - the hub architecture, read/write pumps, ping/pong health checks, and graceful shutdown - form a solid foundation that scales.

Start with this structure and adapt it to your needs. Add authentication, room-based messaging, or custom protocols as your application requires. The core patterns remain the same.

---

*Monitor WebSocket connections with [OneUptime](https://oneuptime.com) - track connection counts, message rates, and errors.*
