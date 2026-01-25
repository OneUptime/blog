# How to Implement Long Polling Without WebSockets in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Long Polling, HTTP, Real-time, Web Development

Description: Learn how to implement long polling in Go for real-time updates when WebSockets are not available or practical, with production-ready patterns and common pitfalls to avoid.

---

Sometimes WebSockets are not an option. Maybe you are working with legacy infrastructure, dealing with restrictive firewalls, or building a service where the simplicity of HTTP makes more sense. Long polling provides a reliable way to deliver near-real-time updates using standard HTTP requests. This guide walks through implementing long polling in Go from scratch.

## What is Long Polling?

Long polling is a technique where the client makes an HTTP request and the server holds it open until new data is available or a timeout occurs. Once the client receives a response, it immediately sends another request. This creates a persistent connection feel while staying within the bounds of regular HTTP.

The flow looks like this:

1. Client sends a request
2. Server holds the request open (up to a timeout)
3. When data is available, server responds
4. Client immediately reconnects
5. Repeat

## Basic Server Implementation

Start with a simple long polling server that holds connections and broadcasts messages to all waiting clients.

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "sync"
    "time"
)

// Message represents data sent to clients
type Message struct {
    ID        string    `json:"id"`
    Content   string    `json:"content"`
    Timestamp time.Time `json:"timestamp"`
}

// LongPollServer manages client connections and message broadcasting
type LongPollServer struct {
    mu       sync.RWMutex
    clients  map[chan Message]struct{}
    messages []Message
}

func NewLongPollServer() *LongPollServer {
    return &LongPollServer{
        clients:  make(map[chan Message]struct{}),
        messages: make([]Message, 0),
    }
}
```

### Handling Poll Requests

The poll handler creates a channel for each client, registers it, and waits for either a message or timeout. The timeout prevents connections from hanging forever.

```go
func (s *LongPollServer) HandlePoll(w http.ResponseWriter, r *http.Request) {
    // Create a channel for this client
    messageChan := make(chan Message, 1)

    // Register the client
    s.mu.Lock()
    s.clients[messageChan] = struct{}{}
    s.mu.Unlock()

    // Clean up when done
    defer func() {
        s.mu.Lock()
        delete(s.clients, messageChan)
        s.mu.Unlock()
        close(messageChan)
    }()

    // Use request context for cancellation (client disconnect)
    ctx := r.Context()

    // Wait for message or timeout (30 seconds is typical)
    select {
    case msg := <-messageChan:
        // Got a message, send it
        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(msg)

    case <-time.After(30 * time.Second):
        // Timeout - send empty response, client will reconnect
        w.WriteHeader(http.StatusNoContent)

    case <-ctx.Done():
        // Client disconnected
        return
    }
}
```

### Broadcasting Messages

When new data arrives, broadcast it to all waiting clients. Each client has a buffered channel, so a slow client does not block others.

```go
func (s *LongPollServer) Broadcast(msg Message) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    for clientChan := range s.clients {
        // Non-blocking send - if client channel is full, skip
        select {
        case clientChan <- msg:
        default:
            // Client is slow or not listening
        }
    }
}

// HandlePublish receives new messages and broadcasts them
func (s *LongPollServer) HandlePublish(w http.ResponseWriter, r *http.Request) {
    if r.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var msg Message
    if err := json.NewDecoder(r.Body).Decode(&msg); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    msg.ID = generateID()
    msg.Timestamp = time.Now()

    s.Broadcast(msg)

    w.WriteHeader(http.StatusAccepted)
}
```

### Running the Server

```go
func main() {
    server := NewLongPollServer()

    http.HandleFunc("/poll", server.HandlePoll)
    http.HandleFunc("/publish", server.HandlePublish)

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func generateID() string {
    return fmt.Sprintf("%d", time.Now().UnixNano())
}
```

## Client Implementation

The client needs to handle reconnection logic, timeouts, and potential errors gracefully. Here is a simple client in Go.

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"
    "time"
)

func pollForMessages(serverURL string) {
    client := &http.Client{
        Timeout: 35 * time.Second, // Slightly longer than server timeout
    }

    for {
        resp, err := client.Get(serverURL + "/poll")
        if err != nil {
            log.Printf("Poll error: %v, retrying in 5s", err)
            time.Sleep(5 * time.Second)
            continue
        }

        if resp.StatusCode == http.StatusNoContent {
            // Timeout, no new data - reconnect immediately
            resp.Body.Close()
            continue
        }

        if resp.StatusCode == http.StatusOK {
            var msg Message
            if err := json.NewDecoder(resp.Body).Decode(&msg); err != nil {
                log.Printf("Decode error: %v", err)
            } else {
                log.Printf("Received: %+v", msg)
            }
        }

        resp.Body.Close()
    }
}
```

## Adding Last-Event-ID for Reliability

Clients can miss messages during reconnection. Add a `lastEventID` parameter so clients can request any messages they missed.

```go
type LongPollServer struct {
    mu       sync.RWMutex
    clients  map[chan Message]struct{}
    messages []Message
    maxHistory int
}

func (s *LongPollServer) HandlePoll(w http.ResponseWriter, r *http.Request) {
    lastID := r.URL.Query().Get("lastEventID")

    // Check for missed messages first
    if lastID != "" {
        missed := s.getMessagesSince(lastID)
        if len(missed) > 0 {
            w.Header().Set("Content-Type", "application/json")
            json.NewEncoder(w).Encode(missed)
            return
        }
    }

    // No missed messages, wait for new ones
    // ... rest of poll logic
}

func (s *LongPollServer) getMessagesSince(lastID string) []Message {
    s.mu.RLock()
    defer s.mu.RUnlock()

    var result []Message
    found := false

    for _, msg := range s.messages {
        if found {
            result = append(result, msg)
        }
        if msg.ID == lastID {
            found = true
        }
    }

    return result
}

func (s *LongPollServer) Broadcast(msg Message) {
    s.mu.Lock()
    // Store message in history
    s.messages = append(s.messages, msg)
    // Trim old messages
    if len(s.messages) > s.maxHistory {
        s.messages = s.messages[len(s.messages)-s.maxHistory:]
    }
    s.mu.Unlock()

    // Broadcast to clients...
}
```

## Per-Channel Subscriptions

In real applications, clients often subscribe to specific topics or channels. Add channel support to avoid broadcasting everything to everyone.

```go
type LongPollServer struct {
    mu       sync.RWMutex
    channels map[string]map[chan Message]struct{}
}

func (s *LongPollServer) HandlePoll(w http.ResponseWriter, r *http.Request) {
    channel := r.URL.Query().Get("channel")
    if channel == "" {
        http.Error(w, "channel parameter required", http.StatusBadRequest)
        return
    }

    messageChan := make(chan Message, 1)

    // Register to specific channel
    s.mu.Lock()
    if s.channels[channel] == nil {
        s.channels[channel] = make(map[chan Message]struct{})
    }
    s.channels[channel][messageChan] = struct{}{}
    s.mu.Unlock()

    defer func() {
        s.mu.Lock()
        delete(s.channels[channel], messageChan)
        s.mu.Unlock()
    }()

    // Wait for message...
}

func (s *LongPollServer) BroadcastToChannel(channel string, msg Message) {
    s.mu.RLock()
    defer s.mu.RUnlock()

    clients := s.channels[channel]
    for clientChan := range clients {
        select {
        case clientChan <- msg:
        default:
        }
    }
}
```

## Best Practices

**Keep timeouts reasonable.** 30 seconds is a good default. Too short creates excessive reconnection overhead. Too long risks hitting load balancer or proxy timeouts.

**Use context for cancellation.** Always respect `r.Context().Done()` to clean up when clients disconnect. Otherwise you leak goroutines.

**Buffer client channels.** A buffer size of 1 prevents blocking when broadcasting. If a client cannot keep up, skip rather than block other clients.

**Implement exponential backoff on errors.** Clients should back off when hitting errors to avoid hammering a failing server.

```go
func pollWithBackoff(serverURL string) {
    backoff := time.Second
    maxBackoff := 30 * time.Second

    for {
        err := doPoll(serverURL)
        if err != nil {
            log.Printf("Error: %v, backing off %v", err, backoff)
            time.Sleep(backoff)
            backoff = min(backoff*2, maxBackoff)
            continue
        }
        // Reset backoff on success
        backoff = time.Second
    }
}
```

**Set appropriate HTTP timeouts.** Configure `ReadHeaderTimeout`, `WriteTimeout`, and `IdleTimeout` on your server to prevent resource exhaustion.

```go
srv := &http.Server{
    Addr:              ":8080",
    ReadHeaderTimeout: 5 * time.Second,
    WriteTimeout:      35 * time.Second,
    IdleTimeout:       60 * time.Second,
}
```

## Common Pitfalls

**Forgetting to close response bodies.** In Go, you must close `resp.Body` or you leak connections. Always use defer or explicit close.

**Ignoring client disconnects.** If you do not check `r.Context().Done()`, your handlers keep running even after clients leave, wasting resources.

**Not handling concurrent map access.** Maps in Go are not thread-safe. Always use a mutex when multiple goroutines access the client registry.

**Blocking broadcasts.** If you use unbuffered channels or blocking sends, one slow client blocks messages to everyone else.

**Missing health checks.** Long polling endpoints often get flagged as unhealthy by load balancers because they take so long to respond. Configure health checks on a separate, fast endpoint.

## When to Use Long Polling vs WebSockets

Long polling works well when:

- You need to support environments where WebSockets are blocked
- Updates are infrequent (less than once per second)
- You want to keep things simple with standard HTTP
- You are building a lightweight notification system

WebSockets are better when:

- You need bidirectional communication
- Updates are frequent (multiple per second)
- You need lower latency than HTTP round-trips allow
- You are building real-time collaborative features

## Summary

Long polling gives you real-time updates without the complexity of WebSockets. The pattern is straightforward: hold requests open, respond when data arrives, reconnect immediately. Add message history for reliability, channels for targeted broadcasts, and proper timeout handling for production use.

Go's goroutines and channels make long polling natural to implement. Each client gets its own goroutine, and broadcasting uses channels for safe concurrent communication. Just remember to handle cleanup properly and respect client disconnections.
