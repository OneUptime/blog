# How to Build Real-Time Notifications with Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, WebSocket, Real-Time, Notifications

Description: Learn how to build a real-time notification system in Go using WebSockets and server-sent events for instant updates.

---

Real-time notifications are essential for modern applications. Whether you are building a chat app, monitoring dashboard, or collaborative tool, users expect instant updates without refreshing. Go's concurrency model makes it ideal for building scalable real-time systems. This guide covers WebSockets, Server-Sent Events (SSE), and the pub/sub pattern for scaling.

## Setting Up a WebSocket Server

WebSockets provide full-duplex communication between client and server. We will use the popular `gorilla/websocket` package.

```go
package main

import (
    "log"
    "net/http"

    "github.com/gorilla/websocket"
)

// upgrader converts HTTP connections to WebSocket connections
var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    // Allow all origins for development (restrict in production)
    CheckOrigin: func(r *http.Request) bool {
        return true
    },
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    // Upgrade HTTP connection to WebSocket
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Failed to upgrade connection: %v", err)
        return
    }
    defer conn.Close()

    // Read messages from client
    for {
        messageType, message, err := conn.ReadMessage()
        if err != nil {
            log.Printf("Read error: %v", err)
            break
        }
        log.Printf("Received: %s", message)

        // Echo message back to client
        if err := conn.WriteMessage(messageType, message); err != nil {
            log.Printf("Write error: %v", err)
            break
        }
    }
}

func main() {
    http.HandleFunc("/ws", handleWebSocket)
    log.Println("WebSocket server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Managing Multiple Connections

For broadcasting notifications to many users, you need a connection manager. This hub pattern tracks all active connections and handles message distribution.

```go
package main

import (
    "sync"

    "github.com/gorilla/websocket"
)

// Client represents a single WebSocket connection
type Client struct {
    conn   *websocket.Conn
    send   chan []byte
    userID string
}

// Hub manages all active WebSocket connections
type Hub struct {
    clients    map[*Client]bool
    broadcast  chan []byte
    register   chan *Client
    unregister chan *Client
    mu         sync.RWMutex
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
            h.mu.Lock()
            h.clients[client] = true
            h.mu.Unlock()

        case client := <-h.unregister:
            // Remove client and close their send channel
            h.mu.Lock()
            if _, ok := h.clients[client]; ok {
                delete(h.clients, client)
                close(client.send)
            }
            h.mu.Unlock()

        case message := <-h.broadcast:
            // Send message to all connected clients
            h.mu.RLock()
            for client := range h.clients {
                select {
                case client.send <- message:
                default:
                    // Client buffer full, disconnect them
                    close(client.send)
                    delete(h.clients, client)
                }
            }
            h.mu.RUnlock()
        }
    }
}
```

## Broadcasting Notifications

With the hub in place, broadcasting becomes simple. Here is how to send notifications to all connected users.

```go
// Notification represents a message to send to clients
type Notification struct {
    Type    string `json:"type"`
    Title   string `json:"title"`
    Message string `json:"message"`
    UserID  string `json:"user_id,omitempty"`
}

// BroadcastNotification sends a notification to all clients
func (h *Hub) BroadcastNotification(n Notification) error {
    data, err := json.Marshal(n)
    if err != nil {
        return err
    }
    h.broadcast <- data
    return nil
}

// SendToUser sends a notification to a specific user
func (h *Hub) SendToUser(userID string, n Notification) {
    data, _ := json.Marshal(n)
    h.mu.RLock()
    defer h.mu.RUnlock()

    for client := range h.clients {
        if client.userID == userID {
            select {
            case client.send <- data:
            default:
                // Skip if buffer is full
            }
        }
    }
}
```

## Server-Sent Events Alternative

SSE is a simpler alternative when you only need server-to-client communication. It uses regular HTTP and automatically reconnects on failure.

```go
func handleSSE(w http.ResponseWriter, r *http.Request) {
    // Set headers for SSE
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")

    // Create a channel for this client
    messageChan := make(chan string)

    // Register client (simplified for example)
    // In production, use a proper client manager

    // Get the flusher for streaming
    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming not supported", http.StatusInternalServerError)
        return
    }

    // Send events to client
    for {
        select {
        case msg := <-messageChan:
            // SSE format: "data: message\n\n"
            fmt.Fprintf(w, "data: %s\n\n", msg)
            flusher.Flush()

        case <-r.Context().Done():
            // Client disconnected
            return
        }
    }
}
```

## Pub/Sub Pattern for Scaling

For production systems with multiple servers, use Redis pub/sub to distribute messages across instances.

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    "github.com/redis/go-redis/v9"
)

type PubSubNotifier struct {
    client *redis.Client
    hub    *Hub
}

func NewPubSubNotifier(redisAddr string, hub *Hub) *PubSubNotifier {
    client := redis.NewClient(&redis.Options{
        Addr: redisAddr,
    })
    return &PubSubNotifier{client: client, hub: hub}
}

// Publish sends a notification to all server instances
func (p *PubSubNotifier) Publish(ctx context.Context, channel string, n Notification) error {
    data, err := json.Marshal(n)
    if err != nil {
        return err
    }
    return p.client.Publish(ctx, channel, data).Err()
}

// Subscribe listens for notifications and broadcasts locally
func (p *PubSubNotifier) Subscribe(ctx context.Context, channel string) {
    pubsub := p.client.Subscribe(ctx, channel)
    defer pubsub.Close()

    // Listen for messages
    for msg := range pubsub.Channel() {
        var n Notification
        if err := json.Unmarshal([]byte(msg.Payload), &n); err != nil {
            log.Printf("Failed to unmarshal notification: %v", err)
            continue
        }
        // Broadcast to local WebSocket clients
        p.hub.BroadcastNotification(n)
    }
}
```

## Putting It All Together

Here is how to wire everything up in your main function:

```go
func main() {
    hub := NewHub()
    go hub.Run()

    // Set up Redis pub/sub for scaling
    notifier := NewPubSubNotifier("localhost:6379", hub)
    go notifier.Subscribe(context.Background(), "notifications")

    // WebSocket endpoint
    http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
        serveWebSocket(hub, w, r)
    })

    // SSE endpoint
    http.HandleFunc("/events", handleSSE)

    // API endpoint to trigger notifications
    http.HandleFunc("/notify", func(w http.ResponseWriter, r *http.Request) {
        n := Notification{
            Type:    "alert",
            Title:   "New Update",
            Message: "Something happened!",
        }
        notifier.Publish(r.Context(), "notifications", n)
        w.WriteHeader(http.StatusOK)
    })

    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Conclusion

Building real-time notifications in Go is straightforward thanks to goroutines and channels. Start with WebSockets for bidirectional communication or SSE for simpler server-to-client updates. As you scale, add Redis pub/sub to distribute messages across multiple server instances. The patterns shown here form a solid foundation for any real-time notification system.
