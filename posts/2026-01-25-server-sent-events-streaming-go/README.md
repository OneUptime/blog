# How to Stream Events with Server-Sent Events in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Server-Sent Events, SSE, Real-time, Streaming

Description: A hands-on guide to implementing Server-Sent Events (SSE) in Go for real-time data streaming, covering the protocol, implementation patterns, and production considerations.

---

When you need to push updates from server to client, you have a few options: WebSockets, long polling, or Server-Sent Events. SSE is often overlooked, but it hits a sweet spot for many use cases. It is simpler than WebSockets, works over plain HTTP, and handles reconnection automatically. This guide walks through building SSE endpoints in Go from scratch.

## What Makes SSE Different

SSE establishes a one-way channel from server to client over HTTP. Unlike WebSockets, there is no bidirectional communication. The client opens a connection and the server streams events down that connection. The browser handles reconnection automatically if the connection drops.

The protocol is dead simple. The server sends a `text/event-stream` content type and writes events in a specific format:

```
event: message
data: {"user": "alice", "text": "hello"}

event: notification
data: You have 3 new messages

```

Each event has an optional type (`event:`), required data (`data:`), optional ID (`id:`), and is terminated by a blank line. That is the entire protocol.

## Basic SSE Handler in Go

Let us start with a minimal working example. The key is setting the right headers and flushing data immediately rather than buffering.

```go
package main

import (
    "fmt"
    "net/http"
    "time"
)

func sseHandler(w http.ResponseWriter, r *http.Request) {
    // Set headers for SSE
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")

    // CORS header if needed - adjust origin as appropriate
    w.Header().Set("Access-Control-Allow-Origin", "*")

    // Get the flusher interface - required for streaming
    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming not supported", http.StatusInternalServerError)
        return
    }

    // Send events every second until client disconnects
    ticker := time.NewTicker(1 * time.Second)
    defer ticker.Stop()

    for {
        select {
        case <-r.Context().Done():
            // Client disconnected
            return
        case t := <-ticker.C:
            // Write SSE formatted event
            fmt.Fprintf(w, "data: Server time is %s\n\n", t.Format(time.RFC3339))
            flusher.Flush()
        }
    }
}

func main() {
    http.HandleFunc("/events", sseHandler)
    http.ListenAndServe(":8080", nil)
}
```

The `http.Flusher` interface is critical. By default, Go buffers response writes for efficiency. For SSE, we need data sent immediately. Calling `Flush()` after each event pushes it to the client right away.

## Structured Events with JSON

Most real applications send structured data. Here is a pattern for typed events with JSON payloads:

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
)

// Event represents a single SSE event
type Event struct {
    Type string      // Optional event type
    ID   string      // Optional event ID for resumption
    Data interface{} // Payload - will be JSON encoded
}

// WriteSSE writes a single event to the response writer
func WriteSSE(w http.ResponseWriter, event Event) error {
    // Write event type if specified
    if event.Type != "" {
        fmt.Fprintf(w, "event: %s\n", event.Type)
    }

    // Write event ID if specified
    if event.ID != "" {
        fmt.Fprintf(w, "id: %s\n", event.ID)
    }

    // Marshal data to JSON
    data, err := json.Marshal(event.Data)
    if err != nil {
        return err
    }

    // Write data and blank line to end event
    fmt.Fprintf(w, "data: %s\n\n", data)

    // Flush immediately
    if f, ok := w.(http.Flusher); ok {
        f.Flush()
    }

    return nil
}

// Example usage in a handler
func notificationHandler(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")

    // Send a typed event
    WriteSSE(w, Event{
        Type: "notification",
        ID:   "12345",
        Data: map[string]interface{}{
            "title":   "New message",
            "body":    "You have a new message from Bob",
            "unread":  5,
        },
    })
}
```

## Handling Multiple Clients with a Broker

Real applications need to broadcast events to many connected clients. A broker pattern works well for this. The broker maintains a registry of connected clients and fans out events to all of them.

```go
package main

import (
    "encoding/json"
    "fmt"
    "net/http"
    "sync"
)

// Broker manages client connections and message broadcasting
type Broker struct {
    clients    map[chan []byte]bool
    register   chan chan []byte
    unregister chan chan []byte
    broadcast  chan []byte
    mu         sync.RWMutex
}

// NewBroker creates a new broker instance
func NewBroker() *Broker {
    return &Broker{
        clients:    make(map[chan []byte]bool),
        register:   make(chan chan []byte),
        unregister: make(chan chan []byte),
        broadcast:  make(chan []byte, 256),
    }
}

// Run starts the broker's main loop
func (b *Broker) Run() {
    for {
        select {
        case client := <-b.register:
            b.mu.Lock()
            b.clients[client] = true
            b.mu.Unlock()

        case client := <-b.unregister:
            b.mu.Lock()
            if _, ok := b.clients[client]; ok {
                delete(b.clients, client)
                close(client)
            }
            b.mu.Unlock()

        case message := <-b.broadcast:
            b.mu.RLock()
            for client := range b.clients {
                select {
                case client <- message:
                    // Message sent successfully
                default:
                    // Client buffer full - skip this message
                    // This prevents slow clients from blocking others
                }
            }
            b.mu.RUnlock()
        }
    }
}

// Publish sends a message to all connected clients
func (b *Broker) Publish(eventType string, data interface{}) error {
    payload, err := json.Marshal(data)
    if err != nil {
        return err
    }

    var message []byte
    if eventType != "" {
        message = []byte(fmt.Sprintf("event: %s\ndata: %s\n\n", eventType, payload))
    } else {
        message = []byte(fmt.Sprintf("data: %s\n\n", payload))
    }

    b.broadcast <- message
    return nil
}

// ServeHTTP handles SSE client connections
func (b *Broker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    w.Header().Set("Content-Type", "text/event-stream")
    w.Header().Set("Cache-Control", "no-cache")
    w.Header().Set("Connection", "keep-alive")
    w.Header().Set("Access-Control-Allow-Origin", "*")

    flusher, ok := w.(http.Flusher)
    if !ok {
        http.Error(w, "Streaming not supported", http.StatusInternalServerError)
        return
    }

    // Create a channel for this client
    clientChan := make(chan []byte, 32)
    b.register <- clientChan

    // Clean up on disconnect
    defer func() {
        b.unregister <- clientChan
    }()

    // Send events to client
    for {
        select {
        case <-r.Context().Done():
            return
        case msg := <-clientChan:
            w.Write(msg)
            flusher.Flush()
        }
    }
}
```

Usage:

```go
func main() {
    broker := NewBroker()
    go broker.Run()

    // SSE endpoint for clients
    http.Handle("/events", broker)

    // Endpoint to publish events
    http.HandleFunc("/publish", func(w http.ResponseWriter, r *http.Request) {
        broker.Publish("alert", map[string]string{
            "message": "Server CPU at 95%",
            "level":   "warning",
        })
        w.WriteHeader(http.StatusOK)
    })

    http.ListenAndServe(":8080", nil)
}
```

## Client-Side JavaScript

The browser's `EventSource` API makes consuming SSE trivial:

```javascript
// Basic connection
const events = new EventSource('/events');

// Handle default message events
events.onmessage = (e) => {
    console.log('Message:', e.data);
};

// Handle named events
events.addEventListener('notification', (e) => {
    const data = JSON.parse(e.data);
    showNotification(data.title, data.body);
});

events.addEventListener('alert', (e) => {
    const data = JSON.parse(e.data);
    displayAlert(data.message, data.level);
});

// Handle errors and automatic reconnection
events.onerror = (e) => {
    if (events.readyState === EventSource.CLOSED) {
        console.log('Connection closed');
    } else {
        console.log('Error occurred, reconnecting...');
    }
};

// Close connection when done
// events.close();
```

The browser automatically reconnects after disconnection. You can control the retry interval from the server by sending a `retry:` field.

## Handling Reconnection with Event IDs

When a client reconnects, the browser sends the last received event ID in the `Last-Event-ID` header. Use this to resume from where the client left off:

```go
func (b *Broker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    // Check if client is reconnecting
    lastEventID := r.Header.Get("Last-Event-ID")
    if lastEventID != "" {
        // Fetch missed events from your store and send them
        missedEvents := fetchEventsSince(lastEventID)
        for _, event := range missedEvents {
            WriteSSE(w, event)
        }
    }

    // Continue with normal streaming...
}
```

## Common Pitfalls

**Buffering issues with proxies**: Nginx and other reverse proxies buffer responses by default. Add these headers to disable buffering:

```go
w.Header().Set("X-Accel-Buffering", "no")  // Nginx
```

Or configure Nginx directly:

```nginx
location /events {
    proxy_pass http://backend;
    proxy_buffering off;
    proxy_cache off;
    proxy_set_header Connection '';
    proxy_http_version 1.1;
    chunked_transfer_encoding off;
}
```

**Connection limits**: Browsers limit connections per domain (typically 6). If your app opens multiple SSE connections, consider multiplexing events over a single connection.

**Memory leaks**: Always clean up client channels when connections close. The context cancellation pattern shown above handles this properly.

**Heartbeats**: Send periodic keep-alive messages to prevent intermediate proxies from timing out idle connections:

```go
// Send a comment (ignored by clients) every 30 seconds
ticker := time.NewTicker(30 * time.Second)
defer ticker.Stop()

for {
    select {
    case <-ticker.C:
        fmt.Fprintf(w, ": heartbeat\n\n")
        flusher.Flush()
    // ... handle other cases
    }
}
```

## When to Use SSE vs WebSockets

Choose SSE when:
- You only need server-to-client communication
- You want automatic reconnection without extra code
- You are streaming updates like notifications, live feeds, or progress updates
- You prefer working with plain HTTP

Choose WebSockets when:
- You need bidirectional communication
- You are building chat, gaming, or collaborative editing
- You need binary data support
- You need to send many messages from client to server

## Summary

SSE provides a lightweight way to push real-time updates to browsers. The protocol is simple, the Go implementation is straightforward, and the browser support is excellent. For unidirectional streaming use cases, SSE often beats WebSockets in simplicity without sacrificing functionality. The broker pattern handles multiple clients efficiently, and proper event IDs enable reliable message delivery even across reconnections.
