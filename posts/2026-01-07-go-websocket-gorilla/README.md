# How to Implement WebSocket Connections in Go with Gorilla WebSocket

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, WebSocket, Real-time, Gorilla, Concurrency

Description: Build real-time WebSocket applications in Go using Gorilla WebSocket with proper connection management, broadcasting, and horizontal scaling strategies.

---

WebSocket connections enable real-time, bidirectional communication between clients and servers. Unlike traditional HTTP request-response cycles, WebSockets maintain persistent connections that allow both parties to send data at any time. This makes them ideal for chat applications, live dashboards, multiplayer games, and collaborative tools.

Go's concurrency model with goroutines and channels makes it particularly well-suited for handling thousands of simultaneous WebSocket connections. The Gorilla WebSocket library has become the de facto standard for WebSocket implementations in Go, offering a complete and well-tested API for building production-ready applications.

In this guide, you will learn how to implement WebSocket connections in Go using Gorilla WebSocket. We will cover connection lifecycle management, broadcasting messages to multiple clients, implementing room-based patterns, maintaining connection health with heartbeats, and scaling horizontally with Redis pub/sub.

## Prerequisites

Before starting, ensure you have:

- Go 1.21 or later installed
- Basic understanding of Go's concurrency primitives (goroutines, channels)
- Familiarity with HTTP handlers in Go
- Redis installed locally or accessible remotely (for the scaling section)

## Installing Gorilla WebSocket

First, initialize your Go module and install the Gorilla WebSocket package.

```bash
# Initialize a new Go module
go mod init websocket-demo

# Install Gorilla WebSocket
go get github.com/gorilla/websocket

# Install Redis client for scaling section
go get github.com/redis/go-redis/v9
```

## Basic WebSocket Server Setup

Let's start with a minimal WebSocket server that accepts connections and echoes messages back to the client.

The upgrader is the core component that transforms an HTTP connection into a WebSocket connection. We configure buffer sizes and origin checking based on our security requirements.

```go
package main

import (
    "log"
    "net/http"

    "github.com/gorilla/websocket"
)

// upgrader configures the WebSocket upgrade parameters
// ReadBufferSize and WriteBufferSize control memory allocation per connection
// CheckOrigin determines which origins are allowed to connect
var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    // In production, implement proper origin checking
    CheckOrigin: func(r *http.Request) bool {
        return true // Allow all origins for development
    },
}

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    // Upgrade the HTTP connection to a WebSocket connection
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Failed to upgrade connection: %v", err)
        return
    }
    defer conn.Close()

    log.Printf("Client connected: %s", conn.RemoteAddr())

    // Simple echo loop - read messages and send them back
    for {
        // ReadMessage blocks until a message is received
        messageType, message, err := conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err,
                websocket.CloseGoingAway,
                websocket.CloseAbnormalClosure) {
                log.Printf("Unexpected close error: %v", err)
            }
            break
        }

        log.Printf("Received: %s", message)

        // Echo the message back to the client
        if err := conn.WriteMessage(messageType, message); err != nil {
            log.Printf("Write error: %v", err)
            break
        }
    }

    log.Printf("Client disconnected: %s", conn.RemoteAddr())
}

func main() {
    http.HandleFunc("/ws", handleWebSocket)

    log.Println("WebSocket server starting on :8080")
    if err := http.ListenAndServe(":8080", nil); err != nil {
        log.Fatal("ListenAndServe error:", err)
    }
}
```

## Connection Lifecycle Management

Production WebSocket applications require proper connection tracking, graceful shutdown handling, and resource cleanup. We will create a Client struct that encapsulates connection state and a Hub that manages all active connections.

The Client struct wraps the WebSocket connection and provides channels for message passing. This design separates read and write operations, preventing concurrent writes which are not safe with Gorilla WebSocket.

```go
package main

import (
    "context"
    "log"
    "net/http"
    "sync"
    "time"

    "github.com/gorilla/websocket"
)

// Configuration constants for connection management
const (
    // Maximum time to wait for a write operation
    writeWait = 10 * time.Second

    // Maximum time to wait for a pong response
    pongWait = 60 * time.Second

    // Interval for sending ping messages (must be less than pongWait)
    pingPeriod = (pongWait * 9) / 10

    // Maximum message size allowed from client
    maxMessageSize = 512 * 1024 // 512KB
)

// Client represents a single WebSocket connection
type Client struct {
    hub  *Hub
    conn *websocket.Conn

    // Buffered channel for outbound messages
    // Buffer size prevents slow clients from blocking the hub
    send chan []byte

    // Unique identifier for the client
    id string
}

// Hub maintains the set of active clients and broadcasts messages
type Hub struct {
    // Registered clients mapped by their ID
    clients map[string]*Client

    // Mutex protects the clients map
    mu sync.RWMutex

    // Channel for incoming broadcast messages
    broadcast chan []byte

    // Channel for client registration
    register chan *Client

    // Channel for client unregistration
    unregister chan *Client

    // Context for graceful shutdown
    ctx    context.Context
    cancel context.CancelFunc
}

// NewHub creates and initializes a new Hub
func NewHub() *Hub {
    ctx, cancel := context.WithCancel(context.Background())
    return &Hub{
        clients:    make(map[string]*Client),
        broadcast:  make(chan []byte, 256),
        register:   make(chan *Client),
        unregister: make(chan *Client),
        ctx:        ctx,
        cancel:     cancel,
    }
}

// Run starts the hub's main event loop
// It handles client registration, unregistration, and broadcasting
func (h *Hub) Run() {
    for {
        select {
        case <-h.ctx.Done():
            // Shutdown signal received
            h.mu.Lock()
            for _, client := range h.clients {
                close(client.send)
            }
            h.clients = make(map[string]*Client)
            h.mu.Unlock()
            return

        case client := <-h.register:
            h.mu.Lock()
            h.clients[client.id] = client
            h.mu.Unlock()
            log.Printf("Client registered: %s (total: %d)", client.id, len(h.clients))

        case client := <-h.unregister:
            h.mu.Lock()
            if _, ok := h.clients[client.id]; ok {
                delete(h.clients, client.id)
                close(client.send)
            }
            h.mu.Unlock()
            log.Printf("Client unregistered: %s (total: %d)", client.id, len(h.clients))

        case message := <-h.broadcast:
            h.mu.RLock()
            for id, client := range h.clients {
                select {
                case client.send <- message:
                    // Message queued successfully
                default:
                    // Client's send buffer is full, consider it dead
                    log.Printf("Client %s send buffer full, disconnecting", id)
                    go func(c *Client) {
                        h.unregister <- c
                    }(client)
                }
            }
            h.mu.RUnlock()
        }
    }
}

// Shutdown gracefully stops the hub
func (h *Hub) Shutdown() {
    h.cancel()
}
```

The read and write pumps handle bidirectional communication for each client. The read pump processes incoming messages while the write pump handles outgoing messages and ping/pong heartbeats.

```go
// readPump pumps messages from the WebSocket connection to the hub
// It runs in its own goroutine for each client
func (c *Client) readPump() {
    defer func() {
        c.hub.unregister <- c
        c.conn.Close()
    }()

    // Configure connection parameters
    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))

    // SetPongHandler is called when a pong is received
    // It resets the read deadline to keep the connection alive
    c.conn.SetPongHandler(func(string) error {
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        _, message, err := c.conn.ReadMessage()
        if err != nil {
            if websocket.IsUnexpectedCloseError(err,
                websocket.CloseGoingAway,
                websocket.CloseAbnormalClosure,
                websocket.CloseNormalClosure) {
                log.Printf("Read error for %s: %v", c.id, err)
            }
            break
        }

        // Broadcast the message to all clients
        c.hub.broadcast <- message
    }
}

// writePump pumps messages from the hub to the WebSocket connection
// It runs in its own goroutine for each client
func (c *Client) writePump() {
    // Ticker for sending periodic ping messages
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
                // The hub closed the channel
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            // Get a writer for a text message
            w, err := c.conn.NextWriter(websocket.TextMessage)
            if err != nil {
                return
            }
            w.Write(message)

            // Batch any queued messages into the same write
            // This improves throughput by reducing syscalls
            n := len(c.send)
            for i := 0; i < n; i++ {
                w.Write([]byte{'\n'})
                w.Write(<-c.send)
            }

            if err := w.Close(); err != nil {
                return
            }

        case <-ticker.C:
            // Send ping to check if connection is still alive
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}
```

## Room-Based Broadcasting Pattern

Many applications need to broadcast messages to specific groups of clients rather than all clients. We will implement a room system that allows clients to join and leave channels.

The Room struct manages a subset of clients that share a common interest. Messages broadcast to a room only reach clients who have joined that room.

```go
package main

import (
    "encoding/json"
    "log"
    "sync"
)

// Room represents a channel that clients can join
type Room struct {
    name    string
    clients map[string]*Client
    mu      sync.RWMutex
}

// RoomManager handles multiple rooms
type RoomManager struct {
    rooms map[string]*Room
    mu    sync.RWMutex
}

// Message types for room operations
type Message struct {
    Type    string          `json:"type"`
    Room    string          `json:"room,omitempty"`
    Content json.RawMessage `json:"content,omitempty"`
}

// NewRoomManager creates a new room manager
func NewRoomManager() *RoomManager {
    return &RoomManager{
        rooms: make(map[string]*Room),
    }
}

// GetOrCreateRoom returns an existing room or creates a new one
func (rm *RoomManager) GetOrCreateRoom(name string) *Room {
    rm.mu.Lock()
    defer rm.mu.Unlock()

    if room, exists := rm.rooms[name]; exists {
        return room
    }

    room := &Room{
        name:    name,
        clients: make(map[string]*Client),
    }
    rm.rooms[name] = room
    log.Printf("Room created: %s", name)
    return room
}

// JoinRoom adds a client to a room
func (rm *RoomManager) JoinRoom(roomName string, client *Client) {
    room := rm.GetOrCreateRoom(roomName)

    room.mu.Lock()
    room.clients[client.id] = client
    room.mu.Unlock()

    log.Printf("Client %s joined room %s", client.id, roomName)
}

// LeaveRoom removes a client from a room
func (rm *RoomManager) LeaveRoom(roomName string, client *Client) {
    rm.mu.RLock()
    room, exists := rm.rooms[roomName]
    rm.mu.RUnlock()

    if !exists {
        return
    }

    room.mu.Lock()
    delete(room.clients, client.id)
    clientCount := len(room.clients)
    room.mu.Unlock()

    log.Printf("Client %s left room %s", client.id, roomName)

    // Clean up empty rooms
    if clientCount == 0 {
        rm.mu.Lock()
        delete(rm.rooms, roomName)
        rm.mu.Unlock()
        log.Printf("Room deleted (empty): %s", roomName)
    }
}

// LeaveAllRooms removes a client from all rooms they have joined
func (rm *RoomManager) LeaveAllRooms(client *Client) {
    rm.mu.RLock()
    rooms := make([]*Room, 0, len(rm.rooms))
    for _, room := range rm.rooms {
        rooms = append(rooms, room)
    }
    rm.mu.RUnlock()

    for _, room := range rooms {
        room.mu.Lock()
        if _, exists := room.clients[client.id]; exists {
            delete(room.clients, client.id)
        }
        room.mu.Unlock()
    }
}

// BroadcastToRoom sends a message to all clients in a specific room
func (rm *RoomManager) BroadcastToRoom(roomName string, message []byte, excludeClient string) {
    rm.mu.RLock()
    room, exists := rm.rooms[roomName]
    rm.mu.RUnlock()

    if !exists {
        return
    }

    room.mu.RLock()
    defer room.mu.RUnlock()

    for id, client := range room.clients {
        // Optionally exclude the sender
        if id == excludeClient {
            continue
        }

        select {
        case client.send <- message:
            // Message queued
        default:
            // Buffer full, skip this client
            log.Printf("Room broadcast: client %s buffer full", id)
        }
    }
}
```

Here is a message handler that processes room join, leave, and broadcast operations based on incoming messages.

```go
// handleMessage processes incoming WebSocket messages
func handleMessage(client *Client, rm *RoomManager, data []byte) {
    var msg Message
    if err := json.Unmarshal(data, &msg); err != nil {
        log.Printf("Invalid message from %s: %v", client.id, err)
        return
    }

    switch msg.Type {
    case "join":
        // Client wants to join a room
        rm.JoinRoom(msg.Room, client)

        // Send confirmation
        response := Message{
            Type: "joined",
            Room: msg.Room,
        }
        if data, err := json.Marshal(response); err == nil {
            client.send <- data
        }

    case "leave":
        // Client wants to leave a room
        rm.LeaveRoom(msg.Room, client)

        // Send confirmation
        response := Message{
            Type: "left",
            Room: msg.Room,
        }
        if data, err := json.Marshal(response); err == nil {
            client.send <- data
        }

    case "message":
        // Broadcast message to room
        rm.BroadcastToRoom(msg.Room, data, "")

    default:
        log.Printf("Unknown message type from %s: %s", client.id, msg.Type)
    }
}
```

## Heartbeat and Connection Health Monitoring

Connection health monitoring is crucial for detecting dead connections early and freeing resources. The ping-pong mechanism built into WebSocket protocol allows servers to verify client liveness.

We have already implemented basic ping-pong in the write pump. Here is an enhanced version with connection state tracking and metrics.

```go
package main

import (
    "sync/atomic"
    "time"
)

// ConnectionStats tracks connection health metrics
type ConnectionStats struct {
    Connected        time.Time
    LastPingAt       time.Time
    LastPongAt       time.Time
    MessagesSent     int64
    MessagesReceived int64
    PingsSent        int64
    PongsReceived    int64
}

// ClientWithStats extends Client with health monitoring
type ClientWithStats struct {
    *Client
    stats ConnectionStats
}

// NewClientWithStats creates a client with stats tracking
func NewClientWithStats(hub *Hub, conn *websocket.Conn, id string) *ClientWithStats {
    return &ClientWithStats{
        Client: &Client{
            hub:  hub,
            conn: conn,
            send: make(chan []byte, 256),
            id:   id,
        },
        stats: ConnectionStats{
            Connected: time.Now(),
        },
    }
}

// RecordMessageSent increments the sent message counter
func (c *ClientWithStats) RecordMessageSent() {
    atomic.AddInt64(&c.stats.MessagesSent, 1)
}

// RecordMessageReceived increments the received message counter
func (c *ClientWithStats) RecordMessageReceived() {
    atomic.AddInt64(&c.stats.MessagesReceived, 1)
}

// writePumpWithStats handles writes with stats tracking
func (c *ClientWithStats) writePumpWithStats() {
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
                c.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }

            if err := c.conn.WriteMessage(websocket.TextMessage, message); err != nil {
                return
            }
            c.RecordMessageSent()

        case <-ticker.C:
            c.conn.SetWriteDeadline(time.Now().Add(writeWait))
            c.stats.LastPingAt = time.Now()
            atomic.AddInt64(&c.stats.PingsSent, 1)

            if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

// readPumpWithStats handles reads with stats tracking
func (c *ClientWithStats) readPumpWithStats() {
    defer func() {
        c.hub.unregister <- c.Client
        c.conn.Close()
    }()

    c.conn.SetReadLimit(maxMessageSize)
    c.conn.SetReadDeadline(time.Now().Add(pongWait))

    c.conn.SetPongHandler(func(appData string) error {
        c.stats.LastPongAt = time.Now()
        atomic.AddInt64(&c.stats.PongsReceived, 1)
        c.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        _, message, err := c.conn.ReadMessage()
        if err != nil {
            break
        }
        c.RecordMessageReceived()
        c.hub.broadcast <- message
    }
}

// GetStats returns a copy of the current stats
func (c *ClientWithStats) GetStats() ConnectionStats {
    return ConnectionStats{
        Connected:        c.stats.Connected,
        LastPingAt:       c.stats.LastPingAt,
        LastPongAt:       c.stats.LastPongAt,
        MessagesSent:     atomic.LoadInt64(&c.stats.MessagesSent),
        MessagesReceived: atomic.LoadInt64(&c.stats.MessagesReceived),
        PingsSent:        atomic.LoadInt64(&c.stats.PingsSent),
        PongsReceived:    atomic.LoadInt64(&c.stats.PongsReceived),
    }
}

// Latency calculates the round-trip time based on last ping-pong
func (c *ClientWithStats) Latency() time.Duration {
    if c.stats.LastPongAt.IsZero() || c.stats.LastPingAt.IsZero() {
        return 0
    }
    return c.stats.LastPongAt.Sub(c.stats.LastPingAt)
}
```

## Horizontal Scaling with Redis Pub/Sub

When running multiple WebSocket server instances behind a load balancer, messages need to be shared across all instances. Redis pub/sub provides a simple and effective solution for this.

The RedisHub wraps our existing Hub and adds Redis pub/sub capabilities. Messages are published to Redis and received by all server instances.

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "os"
    "time"

    "github.com/redis/go-redis/v9"
)

// RedisConfig holds Redis connection settings
type RedisConfig struct {
    Addr     string
    Password string
    DB       int
}

// RedisHub extends Hub with Redis pub/sub for horizontal scaling
type RedisHub struct {
    *Hub
    redisClient *redis.Client
    channel     string
    instanceID  string
}

// BroadcastMessage represents a message in Redis pub/sub
type BroadcastMessage struct {
    InstanceID string          `json:"instance_id"`
    Room       string          `json:"room,omitempty"`
    Data       json.RawMessage `json:"data"`
    Timestamp  int64           `json:"timestamp"`
}

// NewRedisHub creates a hub with Redis pub/sub support
func NewRedisHub(config RedisConfig, channel string) (*RedisHub, error) {
    client := redis.NewClient(&redis.Options{
        Addr:     config.Addr,
        Password: config.Password,
        DB:       config.DB,
    })

    // Test the connection
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    if err := client.Ping(ctx).Err(); err != nil {
        return nil, err
    }

    // Generate unique instance ID
    hostname, _ := os.Hostname()
    instanceID := hostname + "-" + time.Now().Format("20060102150405")

    rh := &RedisHub{
        Hub:         NewHub(),
        redisClient: client,
        channel:     channel,
        instanceID:  instanceID,
    }

    log.Printf("Redis hub initialized: instance=%s channel=%s", instanceID, channel)
    return rh, nil
}

// Run starts the hub and Redis subscription
func (rh *RedisHub) Run() {
    // Start the base hub
    go rh.Hub.Run()

    // Start Redis subscription
    go rh.subscribeRedis()

    // Process local broadcasts and publish to Redis
    rh.processBroadcasts()
}

// subscribeRedis listens for messages from other instances
func (rh *RedisHub) subscribeRedis() {
    ctx := rh.Hub.ctx
    pubsub := rh.redisClient.Subscribe(ctx, rh.channel)
    defer pubsub.Close()

    ch := pubsub.Channel()

    for {
        select {
        case <-ctx.Done():
            return

        case msg := <-ch:
            var bm BroadcastMessage
            if err := json.Unmarshal([]byte(msg.Payload), &bm); err != nil {
                log.Printf("Invalid Redis message: %v", err)
                continue
            }

            // Ignore messages from this instance
            if bm.InstanceID == rh.instanceID {
                continue
            }

            // Broadcast to local clients
            rh.broadcastLocal(bm.Data)
        }
    }
}

// processBroadcasts handles local broadcasts and publishes to Redis
func (rh *RedisHub) processBroadcasts() {
    for {
        select {
        case <-rh.Hub.ctx.Done():
            return

        case message := <-rh.Hub.broadcast:
            // Broadcast to local clients
            rh.broadcastLocal(message)

            // Publish to Redis for other instances
            rh.publishToRedis(message, "")
        }
    }
}

// broadcastLocal sends a message to all local clients
func (rh *RedisHub) broadcastLocal(message []byte) {
    rh.Hub.mu.RLock()
    defer rh.Hub.mu.RUnlock()

    for _, client := range rh.Hub.clients {
        select {
        case client.send <- message:
        default:
            // Buffer full
        }
    }
}

// publishToRedis publishes a message to Redis
func (rh *RedisHub) publishToRedis(data []byte, room string) {
    bm := BroadcastMessage{
        InstanceID: rh.instanceID,
        Room:       room,
        Data:       data,
        Timestamp:  time.Now().UnixNano(),
    }

    payload, err := json.Marshal(bm)
    if err != nil {
        log.Printf("Failed to marshal broadcast message: %v", err)
        return
    }

    ctx, cancel := context.WithTimeout(context.Background(), time.Second)
    defer cancel()

    if err := rh.redisClient.Publish(ctx, rh.channel, payload).Err(); err != nil {
        log.Printf("Failed to publish to Redis: %v", err)
    }
}

// BroadcastToRoom publishes a message to a specific room across all instances
func (rh *RedisHub) BroadcastToRoom(room string, data []byte) {
    rh.publishToRedis(data, room)
}

// Shutdown gracefully closes Redis connections
func (rh *RedisHub) Shutdown() {
    rh.Hub.Shutdown()
    rh.redisClient.Close()
}
```

## Complete Server Implementation

Here is a complete server that combines all the components we have built. It includes connection management, room support, and Redis scaling.

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/google/uuid"
    "github.com/gorilla/websocket"
)

var upgrader = websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
    CheckOrigin: func(r *http.Request) bool {
        // Implement proper origin checking in production
        return true
    },
}

// Server holds all WebSocket infrastructure
type Server struct {
    hub         *RedisHub
    roomManager *RoomManager
}

// NewServer creates a new WebSocket server
func NewServer(redisAddr string) (*Server, error) {
    hub, err := NewRedisHub(RedisConfig{
        Addr: redisAddr,
    }, "websocket:broadcast")
    if err != nil {
        return nil, err
    }

    return &Server{
        hub:         hub,
        roomManager: NewRoomManager(),
    }, nil
}

// handleWebSocket handles new WebSocket connections
func (s *Server) handleWebSocket(w http.ResponseWriter, r *http.Request) {
    conn, err := upgrader.Upgrade(w, r, nil)
    if err != nil {
        log.Printf("Upgrade error: %v", err)
        return
    }

    // Generate unique client ID
    clientID := uuid.New().String()

    client := &Client{
        hub:  s.hub.Hub,
        conn: conn,
        send: make(chan []byte, 256),
        id:   clientID,
    }

    s.hub.Hub.register <- client

    // Start client goroutines
    go s.writePump(client)
    go s.readPump(client)
}

// readPump handles incoming messages from a client
func (s *Server) readPump(client *Client) {
    defer func() {
        s.roomManager.LeaveAllRooms(client)
        s.hub.Hub.unregister <- client
        client.conn.Close()
    }()

    client.conn.SetReadLimit(maxMessageSize)
    client.conn.SetReadDeadline(time.Now().Add(pongWait))
    client.conn.SetPongHandler(func(string) error {
        client.conn.SetReadDeadline(time.Now().Add(pongWait))
        return nil
    })

    for {
        _, data, err := client.conn.ReadMessage()
        if err != nil {
            break
        }

        var msg Message
        if err := json.Unmarshal(data, &msg); err != nil {
            continue
        }

        switch msg.Type {
        case "join":
            s.roomManager.JoinRoom(msg.Room, client)
        case "leave":
            s.roomManager.LeaveRoom(msg.Room, client)
        case "message":
            if msg.Room != "" {
                s.roomManager.BroadcastToRoom(msg.Room, data, client.id)
            } else {
                s.hub.Hub.broadcast <- data
            }
        }
    }
}

// writePump handles outgoing messages to a client
func (s *Server) writePump(client *Client) {
    ticker := time.NewTicker(pingPeriod)
    defer func() {
        ticker.Stop()
        client.conn.Close()
    }()

    for {
        select {
        case message, ok := <-client.send:
            client.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if !ok {
                client.conn.WriteMessage(websocket.CloseMessage, []byte{})
                return
            }
            if err := client.conn.WriteMessage(websocket.TextMessage, message); err != nil {
                return
            }
        case <-ticker.C:
            client.conn.SetWriteDeadline(time.Now().Add(writeWait))
            if err := client.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
                return
            }
        }
    }
}

// healthHandler provides a health check endpoint
func (s *Server) healthHandler(w http.ResponseWriter, r *http.Request) {
    s.hub.Hub.mu.RLock()
    clientCount := len(s.hub.Hub.clients)
    s.hub.Hub.mu.RUnlock()

    response := map[string]interface{}{
        "status":  "healthy",
        "clients": clientCount,
    }

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(response)
}

func main() {
    redisAddr := os.Getenv("REDIS_ADDR")
    if redisAddr == "" {
        redisAddr = "localhost:6379"
    }

    server, err := NewServer(redisAddr)
    if err != nil {
        log.Fatalf("Failed to create server: %v", err)
    }

    // Start the hub
    go server.hub.Run()

    // Set up HTTP handlers
    http.HandleFunc("/ws", server.handleWebSocket)
    http.HandleFunc("/health", server.healthHandler)

    // Create HTTP server with timeouts
    httpServer := &http.Server{
        Addr:         ":8080",
        ReadTimeout:  10 * time.Second,
        WriteTimeout: 10 * time.Second,
    }

    // Graceful shutdown
    go func() {
        sigint := make(chan os.Signal, 1)
        signal.Notify(sigint, os.Interrupt, syscall.SIGTERM)
        <-sigint

        log.Println("Shutting down server...")

        ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
        defer cancel()

        server.hub.Shutdown()
        httpServer.Shutdown(ctx)
    }()

    log.Println("WebSocket server starting on :8080")
    if err := httpServer.ListenAndServe(); err != http.ErrServerClosed {
        log.Fatalf("HTTP server error: %v", err)
    }

    log.Println("Server stopped")
}
```

## Testing Your WebSocket Server

You can test your WebSocket server using a simple JavaScript client or command-line tools.

Here is a JavaScript client that connects to the server and joins a room.

```javascript
// test-client.js - Run with Node.js or in browser console
const ws = new WebSocket('ws://localhost:8080/ws');

ws.onopen = () => {
    console.log('Connected');

    // Join a room
    ws.send(JSON.stringify({
        type: 'join',
        room: 'general'
    }));
};

ws.onmessage = (event) => {
    const msg = JSON.parse(event.data);
    console.log('Received:', msg);
};

ws.onclose = () => {
    console.log('Disconnected');
};

// Send a message to the room
function sendMessage(content) {
    ws.send(JSON.stringify({
        type: 'message',
        room: 'general',
        content: content
    }));
}
```

You can also test with wscat, a command-line WebSocket client.

```bash
# Install wscat
npm install -g wscat

# Connect to your server
wscat -c ws://localhost:8080/ws

# Send messages
{"type": "join", "room": "general"}
{"type": "message", "room": "general", "content": "Hello, world!"}
```

## Performance Considerations

When building production WebSocket applications, keep these performance tips in mind.

Buffer sizes matter. The read and write buffer sizes in the upgrader determine memory usage per connection. A 1KB buffer uses less memory but may require more syscalls for large messages. Tune based on your message sizes.

```go
// For small messages (chat, notifications)
upgrader := websocket.Upgrader{
    ReadBufferSize:  1024,
    WriteBufferSize: 1024,
}

// For larger messages (file transfers, media)
upgrader := websocket.Upgrader{
    ReadBufferSize:  4096,
    WriteBufferSize: 4096,
}
```

Use connection pooling for Redis. When scaling horizontally, ensure your Redis client uses connection pooling to handle concurrent publish and subscribe operations efficiently.

```go
client := redis.NewClient(&redis.Options{
    Addr:         "localhost:6379",
    PoolSize:     100,
    MinIdleConns: 10,
    PoolTimeout:  30 * time.Second,
})
```

Implement backpressure handling. When a client cannot keep up with incoming messages, you need to decide whether to drop messages or disconnect the client.

```go
// Drop messages if buffer is full (non-blocking)
select {
case client.send <- message:
default:
    log.Printf("Dropping message for slow client %s", client.id)
}

// Or disconnect slow clients
select {
case client.send <- message:
default:
    log.Printf("Disconnecting slow client %s", client.id)
    close(client.send)
    delete(hub.clients, client.id)
}
```

## Security Best Practices

Security is critical for WebSocket applications exposed to the internet.

Validate the origin header. The CheckOrigin function in the upgrader should validate that connections come from trusted sources.

```go
var allowedOrigins = map[string]bool{
    "https://example.com":     true,
    "https://app.example.com": true,
}

upgrader := websocket.Upgrader{
    CheckOrigin: func(r *http.Request) bool {
        origin := r.Header.Get("Origin")
        return allowedOrigins[origin]
    },
}
```

Implement authentication. Verify user identity before establishing WebSocket connections.

```go
func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    // Verify JWT token from query parameter or cookie
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

    // Associate connection with authenticated user
    client := &Client{
        id:   userID,
        conn: conn,
        // ...
    }
}
```

Rate limit connections and messages. Protect against denial of service attacks by limiting how many connections and messages a client can send.

```go
// Connection rate limiter per IP
var connectionLimiter = rate.NewLimiter(rate.Every(time.Second), 10)

func handleWebSocket(w http.ResponseWriter, r *http.Request) {
    if !connectionLimiter.Allow() {
        http.Error(w, "Too many connections", http.StatusTooManyRequests)
        return
    }
    // ...
}
```

## Conclusion

You have learned how to implement production-ready WebSocket connections in Go using Gorilla WebSocket. The key concepts covered include:

- Setting up the Gorilla WebSocket upgrader with proper configuration
- Managing connection lifecycles with the Hub pattern
- Implementing bidirectional communication with read and write pumps
- Building room-based broadcasting for targeted message delivery
- Monitoring connection health with ping-pong heartbeats
- Scaling horizontally with Redis pub/sub

These patterns form the foundation for building real-time applications that can handle thousands of concurrent connections. The Hub pattern with channels provides clean separation of concerns, while Redis pub/sub enables seamless horizontal scaling across multiple server instances.

For production deployments, consider adding structured logging, metrics collection with Prometheus, and distributed tracing. Monitor connection counts, message throughput, and latency to ensure your WebSocket infrastructure meets your performance requirements.
