# How to Build WebSocket Server with Gorilla in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, WebSocket, Gorilla, Real-Time

Description: Learn how to build a production-ready WebSocket server in Go using the Gorilla WebSocket library with proper connection handling and scaling.

---

WebSockets provide full-duplex communication channels over a single TCP connection, making them ideal for real-time applications like chat systems, live dashboards, and collaborative tools. The Gorilla WebSocket library is the most popular and battle-tested implementation for Go. This guide walks you through building a production-ready WebSocket server with proper connection management.

## Installing Gorilla WebSocket

Start by adding the Gorilla WebSocket package to your project:

```bash
go get github.com/gorilla/websocket
```

## Setting Up the Upgrader

The upgrader handles the HTTP to WebSocket protocol upgrade. Configure it with appropriate buffer sizes and origin checking:

```go
package main

import (
    "log"
    "net/http"
    "github.com/gorilla/websocket"
)

// upgrader configures the WebSocket connection parameters
var upgrader = websocket.Upgrader{
    // ReadBufferSize specifies the buffer size for reading messages
    ReadBufferSize:  1024,
    // WriteBufferSize specifies the buffer size for writing messages
    WriteBufferSize: 1024,
    // CheckOrigin validates the request origin
    // In production, implement proper origin validation
    CheckOrigin: func(r *http.Request) bool {
        allowedOrigins := []string{"https://yourdomain.com"}
        origin := r.Header.Get("Origin")
        for _, allowed := range allowedOrigins {
            if origin == allowed {
                return true
            }
        }
        return false
    },
}
```

## Connection Hub for Broadcasting

A hub manages all active connections and handles message broadcasting. This pattern allows you to send messages to all connected clients efficiently:

```go
// Client represents a single WebSocket connection
type Client struct {
    hub  *Hub
    conn *websocket.Conn
    send chan []byte
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
}

// NewHub creates a new Hub instance
func NewHub() *Hub {
    return &Hub{
        clients:    make(map[*Client]bool),
        broadcast:  make(chan []byte),
        register:   make(chan *Client),
        unregister: make(chan *Client),
    }
}

// Run starts the hub's main loop
func (h *Hub) Run() {
    for {
        select {
        case client := <-h.register:
            // Add new client to the map
            h.clients[client] = true
            log.Printf("Client connected. Total clients: %d", len(h.clients))

        case client := <-h.unregister:
            // Remove client and close their send channel
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
                default:
                    // Client buffer full, remove them
                    close(client.send)
                    delete(h.clients, client)
                }
            }
        }
    }
}
```

## Ping/Pong Heartbeats

WebSocket connections can silently die. Implement ping/pong to detect dead connections:

```go
import "time"

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

// readPump pumps messages from the WebSocket connection to the hub
func (c *Client) readPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))

    // Reset the read deadline when we receive a pong
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        _, message, err := c.conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err,
                websocket.CloseGoingAway,
                websocket.CloseAbnormalClosure) {
                log.Printf("Error: %v", err)
            }
            break
        }
        // Broadcast the received message to all clients
        c.hub.broadcast <- message
    }
}

// writePump pumps messages from the hub to the WebSocket connection
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

            // Write the message to the WebSocket
            w, err := c.conn.NextWriter(websocket.TextMessage)
            if err != nil {
                return
            }
            w.Write(message)

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

## HTTP Handler and Graceful Shutdown

Wire everything together with an HTTP handler and implement graceful shutdown:

```go
import (
    "context"
    "os"
    "os/signal"
    "syscall"
)

// serveWs handles WebSocket requests from the client
func serveWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
    // Upgrade the HTTP connection to WebSocket
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Upgrade error: %v", err)
        return
    }

    // Create a new client for this connection
    client := &Client{
        hub:  hub,
        conn: conn,
        send: make(chan []byte, 256),
    }
    client.hub.register <- client

    // Start the read and write pumps in separate goroutines
    go client.writePump()
    go client.readPump()
}

func main() {
    hub := NewHub()
    go hub.Run()

    http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
        serveWs(hub, w, r)
    })

    server := &http.Server{Addr: ":8080"}

    // Handle graceful shutdown
    go func() {
        sigChan := make(chan os.Signal, 1)
        signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
        <-sigChan

        log.Println("Shutting down server...")
        ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()

        if err := server.Shutdown(ctx); err != nil {
            log.Printf("Server shutdown error: %v", err)
        }
    }()

    log.Println("WebSocket server starting on :8080")
    if err := server.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatalf("Server error: %v", err)
    }
    log.Println("Server stopped")
}
```

## Scaling Considerations

For production deployments with multiple server instances, you need external message passing. Redis Pub/Sub is a common choice:

```go
import "github.com/go-redis/redis/v8"

// Subscribe to Redis and forward messages to the local hub
func subscribeToRedis(ctx context.Context, rdb *redis.Client, hub *Hub) {
    pubsub := rdb.Subscribe(ctx, "websocket-broadcast")
    defer pubsub.Close()

    ch := pubsub.Channel()
    for msg := range ch {
        hub.broadcast <- []byte(msg.Payload)
    }
}
```

This architecture allows multiple WebSocket servers to share messages across instances, enabling horizontal scaling behind a load balancer.

## Conclusion

The Gorilla WebSocket library provides a solid foundation for building real-time applications in Go. Key takeaways include configuring the upgrader with proper origin checks, using a hub pattern for connection management, implementing ping/pong heartbeats to detect dead connections, and handling graceful shutdown. For production systems, consider adding authentication middleware, rate limiting, and external message passing for multi-instance deployments.
