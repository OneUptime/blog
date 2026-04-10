# How to Use Redis for Go WebSocket Scaling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Redis, Go, WebSocket, Pub/Sub, Scaling

Description: Learn how to scale Go WebSocket servers horizontally using Redis Pub/Sub as a message broker to broadcast messages across multiple server instances.

---

## The Problem with WebSocket Scaling

When you run a single Go WebSocket server, broadcasting a message to all connected clients is straightforward - iterate over a local map of connections and write to each one. However, when you scale horizontally to multiple instances, a message received on server A cannot be delivered to clients connected to server B. Redis Pub/Sub solves this by acting as a shared message broker.

## Architecture

```text
Client A ---- Server 1 ----+
                            +---- Redis Pub/Sub ---- Broadcast to all servers
Client B ---- Server 2 ----+
Client C ---- Server 2
```

Every server subscribes to a Redis channel. When any server receives a WebSocket message from a client, it publishes to Redis, and all servers (including itself) receive the message and forward it to their local connections.

## Prerequisites

- Go 1.21 or higher
- A running Redis server
- `github.com/gorilla/websocket` and `github.com/redis/go-redis/v9`

```bash
go get github.com/gorilla/websocket
go get github.com/redis/go-redis/v9
```

## Hub with Redis Pub/Sub

### Connection Hub

```go
package main

import (
    "sync"

    "github.com/redis/go-redis/v9"
)

type Hub struct {
    clients    map[*Client]bool
    mu         sync.RWMutex
    rdb        *redis.Client
    channel    string
    broadcast  chan []byte
}

type Client struct {
    hub  *Hub
    send chan []byte
}

func NewHub(rdb *redis.Client, channel string) *Hub {
    return &Hub{
        clients:   make(map[*Client]bool),
        rdb:       rdb,
        channel:   channel,
        broadcast: make(chan []byte, 256),
    }
}

func (h *Hub) Register(c *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    h.clients[c] = true
}

func (h *Hub) Unregister(c *Client) {
    h.mu.Lock()
    defer h.mu.Unlock()
    if _, ok := h.clients[c]; ok {
        delete(h.clients, c)
        close(c.send)
    }
}

func (h *Hub) BroadcastLocal(msg []byte) {
    h.mu.Lock()
    defer h.mu.Unlock()
    for c := range h.clients {
        select {
        case c.send <- msg:
        default:
            close(c.send)
            delete(h.clients, c)
        }
    }
}
```

### Redis Publisher and Subscriber

```go
package main

import (
    "context"
    "log"
)

// PublishToRedis sends a message to the Redis channel
func (h *Hub) PublishToRedis(ctx context.Context, msg []byte) error {
    return h.rdb.Publish(ctx, h.channel, msg).Err()
}

// SubscribeToRedis listens for messages and broadcasts locally
func (h *Hub) SubscribeToRedis(ctx context.Context) {
    sub := h.rdb.Subscribe(ctx, h.channel)
    defer sub.Close()

    ch := sub.Channel()
    for {
        select {
        case msg, ok := <-ch:
            if !ok {
                log.Println("Redis subscription closed")
                return
            }
            h.BroadcastLocal([]byte(msg.Payload))
        case <-ctx.Done():
            return
        }
    }
}
```

### WebSocket Handler

```go
package main

import (
    "context"
    "log"
    "net/http"

    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        return true // Restrict in production
    },
}

func ServeWs(hub *Hub, w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Println("Upgrade error:", err)
        return
    }

    client := &Client{hub: hub, send: make(chan []byte, 256)}
    hub.Register(client)

    ctx := context.Background()

    // Read goroutine
    go func() {
        defer func() {
            hub.Unregister(client)
            conn.Close()
        }()
        for {
            _, msg, err := conn.ReadMessage()
            if err != nil {
                break
            }
            // Publish to Redis so all servers receive it
            if err := hub.PublishToRedis(ctx, msg); err != nil {
                log.Println("Publish error:", err)
            }
        }
    }()

    // Write goroutine
    go func() {
        defer conn.Close()
        for msg := range client.send {
            if err := conn.WriteMessage(websocket.TextMessage, msg); err != nil {
                break
            }
        }
    }()
}
```

### Main Entry Point

```go
package main

import (
    "context"
    "log"
    "net/http"

    "github.com/redis/go-redis/v9"
)

func main() {
    rdb := redis.NewClient(&redis.Options{
        Addr: "localhost:6379",
    })

    ctx := context.Background()
    if err := rdb.Ping(ctx).Err(); err != nil {
        log.Fatal("Cannot connect to Redis:", err)
    }

    hub := NewHub(rdb, "ws:global-chat")

    // Start subscribing to Redis in the background
    go hub.SubscribeToRedis(ctx)

    http.HandleFunc("/ws", func(w http.ResponseWriter, r *http.Request) {
        ServeWs(hub, w, r)
    })

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Room-Based Channels

For per-room broadcasting, use dynamic channel names:

```go
func roomChannel(roomID string) string {
    return "ws:room:" + roomID
}

// Each room gets its own hub subscribed to its own Redis channel
func handleRoomMessage(rdb *redis.Client, roomID string, msg []byte) error {
    ctx := context.Background()
    return rdb.Publish(ctx, roomChannel(roomID), msg).Err()
}
```

## Deployment

Run multiple instances pointing to the same Redis server:

```bash
# Terminal 1
REDIS_URL=redis://localhost:6379 PORT=8080 ./server

# Terminal 2
REDIS_URL=redis://localhost:6379 PORT=8081 ./server
```

Place a load balancer (Nginx, HAProxy) in front with WebSocket support enabled:

```text
upstream websockets {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
}
```

## Summary

Scaling Go WebSocket servers horizontally requires a shared message broker, and Redis Pub/Sub is the standard solution. Each server instance subscribes to a Redis channel; when a client sends a message, the receiving server publishes it to Redis, which fan-outs the message to all server instances that then deliver it to their local WebSocket connections. This pattern works for both global broadcast and room-based chat scenarios.
