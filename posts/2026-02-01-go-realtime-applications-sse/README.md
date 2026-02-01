# How to Build Real-time Applications with Go and SSE (Server-Sent Events)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, SSE, Server-Sent Events, Real-time, HTTP, Streaming

Description: A practical guide to implementing Server-Sent Events in Go for building real-time applications like live dashboards and notification systems.

---

Real-time features are everywhere - live dashboards, notification feeds, stock tickers, and activity streams. While WebSockets often get the spotlight, Server-Sent Events (SSE) is a simpler, more elegant solution for many use cases. Go's standard library makes SSE implementation straightforward with zero external dependencies.

## What is SSE?

Server-Sent Events is a standard that allows servers to push data to clients over HTTP. Unlike WebSockets, SSE is unidirectional - data flows from server to client only. The connection stays open, and the server sends events as they occur.

The protocol is dead simple. It uses plain text over HTTP with a specific format:

```
event: message
data: {"user": "alice", "action": "login"}

event: notification
data: New comment on your post

```

Each event is separated by a blank line. The browser's `EventSource` API handles connection management, automatic reconnection, and parsing.

## SSE vs WebSockets - When to Use What

Both technologies enable real-time communication, but they serve different purposes.

**Use SSE when:**
- Data flows primarily from server to client
- You need automatic reconnection out of the box
- You want to work with existing HTTP infrastructure (proxies, load balancers)
- Simplicity matters more than bidirectional communication
- You're building dashboards, feeds, or notification systems

**Use WebSockets when:**
- You need bidirectional communication (chat applications, collaborative editing)
- Low latency for client-to-server messages is critical
- You're building multiplayer games or trading platforms

SSE works over standard HTTP, which means it plays nicely with existing infrastructure. No special proxy configuration needed. It also automatically reconnects if the connection drops, sending the last event ID so the server can replay missed events.

## Basic SSE Server in Go

Go's `net/http` package has everything you need for SSE. The key is setting the right headers and flushing the response after each event.

Here's a minimal SSE endpoint:

```go
package main

import (
	"fmt"
	"net/http"
	"time"
)

func main() {
	http.HandleFunc("/events", handleSSE)
	http.ListenAndServe(":8080", nil)
}

// handleSSE sets up an SSE connection and sends events every second
func handleSSE(w http.ResponseWriter, r *http.Request) {
	// Set headers required for SSE
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	
	// Enable CORS if needed
	w.Header().Set("Access-Control-Allow-Origin", "*")

	// Get the flusher interface for streaming responses
	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Send events until the client disconnects
	for {
		select {
		case <-r.Context().Done():
			// Client disconnected
			return
		default:
			// Send a timestamped event
			fmt.Fprintf(w, "data: Server time: %s\n\n", time.Now().Format(time.RFC3339))
			flusher.Flush()
			time.Sleep(time.Second)
		}
	}
}
```

The critical parts are:
- `Content-Type: text/event-stream` tells the browser this is an SSE stream
- `http.Flusher` sends data immediately instead of buffering
- `r.Context().Done()` detects when the client disconnects

## SSE Event Format

The SSE protocol supports several fields:

```
id: 123
event: user_login
data: {"user": "alice"}
retry: 5000

```

- **id**: Event identifier. The browser sends this as `Last-Event-ID` header on reconnection
- **event**: Custom event type. Defaults to "message" if not specified
- **data**: The actual payload. Can span multiple lines
- **retry**: Reconnection delay in milliseconds

Here's a helper function for sending formatted events:

```go
// Event represents an SSE event with all optional fields
type Event struct {
	ID    string
	Event string
	Data  string
	Retry int
}

// writeEvent formats and writes an SSE event to the response
func writeEvent(w http.ResponseWriter, event Event) {
	// Write event ID if present - used for reconnection
	if event.ID != "" {
		fmt.Fprintf(w, "id: %s\n", event.ID)
	}
	
	// Write event type if it's not the default "message"
	if event.Event != "" {
		fmt.Fprintf(w, "event: %s\n", event.Event)
	}
	
	// Write the data payload
	fmt.Fprintf(w, "data: %s\n", event.Data)
	
	// Set custom retry interval if specified
	if event.Retry > 0 {
		fmt.Fprintf(w, "retry: %d\n", event.Retry)
	}
	
	// Blank line marks the end of the event
	fmt.Fprint(w, "\n")
}
```

## Connection Management

Production SSE implementations need proper connection handling. This means tracking connected clients, sending heartbeats, and cleaning up gracefully.

### Client Registry

A broker pattern works well for managing multiple clients:

```go
// Broker manages SSE client connections and broadcast messages
type Broker struct {
	// clients holds all active client channels
	clients map[chan Event]bool
	
	// newClients receives channels for newly connected clients
	newClients chan chan Event
	
	// closingClients receives channels for disconnecting clients
	closingClients chan chan Event
	
	// events receives events to broadcast to all clients
	events chan Event
	
	mu sync.RWMutex
}

// NewBroker creates and starts a new SSE broker
func NewBroker() *Broker {
	b := &Broker{
		clients:        make(map[chan Event]bool),
		newClients:     make(chan chan Event),
		closingClients: make(chan chan Event),
		events:         make(chan Event),
	}
	go b.run()
	return b
}

// run handles client registration, removal, and event broadcasting
func (b *Broker) run() {
	for {
		select {
		case client := <-b.newClients:
			// Register new client
			b.mu.Lock()
			b.clients[client] = true
			b.mu.Unlock()
			
		case client := <-b.closingClients:
			// Remove disconnected client and close their channel
			b.mu.Lock()
			delete(b.clients, client)
			close(client)
			b.mu.Unlock()
			
		case event := <-b.events:
			// Broadcast event to all connected clients
			b.mu.RLock()
			for client := range b.clients {
				select {
				case client <- event:
					// Event sent successfully
				default:
					// Client buffer full, skip this event
				}
			}
			b.mu.RUnlock()
		}
	}
}

// Broadcast sends an event to all connected clients
func (b *Broker) Broadcast(event Event) {
	b.events <- event
}

// ClientCount returns the number of connected clients
func (b *Broker) ClientCount() int {
	b.mu.RLock()
	defer b.mu.RUnlock()
	return len(b.clients)
}
```

### SSE Handler with the Broker

Now connect the broker to an HTTP handler:

```go
// ServeHTTP handles SSE connections using the broker
func (b *Broker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Create a channel for this client with a buffer to prevent blocking
	clientChan := make(chan Event, 10)
	
	// Register the client
	b.newClients <- clientChan

	// Remove client when handler exits
	defer func() {
		b.closingClients <- clientChan
	}()

	// Listen for client disconnect
	ctx := r.Context()

	for {
		select {
		case <-ctx.Done():
			// Client disconnected
			return
		case event := <-clientChan:
			// Send event to this client
			writeEvent(w, event)
			flusher.Flush()
		}
	}
}
```

### Heartbeats

Proxies and load balancers often close idle connections. Send periodic heartbeats to keep the connection alive:

```go
// startHeartbeat sends a comment every 30 seconds to keep the connection alive
func startHeartbeat(ctx context.Context, w http.ResponseWriter, flusher http.Flusher) {
	ticker := time.NewTicker(30 * time.Second)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			// SSE comment - starts with colon, ignored by browser but keeps connection alive
			fmt.Fprint(w, ": heartbeat\n\n")
			flusher.Flush()
		}
	}
}
```

Integrate heartbeats into your handler by running it as a goroutine:

```go
// Start heartbeat in the background
go startHeartbeat(ctx, w, flusher)
```

## Handling Reconnection

SSE clients automatically reconnect when the connection drops. The browser sends the last event ID it received, letting you replay missed events.

```go
// ServeHTTP handles SSE connections with reconnection support
func (b *Broker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	// Check if this is a reconnection
	lastEventID := r.Header.Get("Last-Event-ID")
	if lastEventID != "" {
		// Client is reconnecting - replay missed events
		b.replayEvents(w, lastEventID)
	}

	// ... rest of the handler
}

// replayEvents sends all events after the given ID to catch up the client
func (b *Broker) replayEvents(w http.ResponseWriter, lastID string) {
	// This requires storing recent events
	// Implementation depends on your storage strategy
}
```

For replay support, you need to store recent events. A ring buffer works well:

```go
// EventBuffer stores recent events for replay on reconnection
type EventBuffer struct {
	events []Event
	size   int
	mu     sync.RWMutex
}

// NewEventBuffer creates a buffer that holds the last n events
func NewEventBuffer(size int) *EventBuffer {
	return &EventBuffer{
		events: make([]Event, 0, size),
		size:   size,
	}
}

// Add stores an event in the buffer, removing the oldest if full
func (eb *EventBuffer) Add(event Event) {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	
	if len(eb.events) >= eb.size {
		// Remove oldest event
		eb.events = eb.events[1:]
	}
	eb.events = append(eb.events, event)
}

// GetAfter returns all events after the given ID
func (eb *EventBuffer) GetAfter(id string) []Event {
	eb.mu.RLock()
	defer eb.mu.RUnlock()
	
	// Find the index of the last received event
	startIdx := -1
	for i, e := range eb.events {
		if e.ID == id {
			startIdx = i + 1
			break
		}
	}
	
	if startIdx == -1 || startIdx >= len(eb.events) {
		return nil
	}
	
	// Return a copy of events after the given ID
	result := make([]Event, len(eb.events)-startIdx)
	copy(result, eb.events[startIdx:])
	return result
}
```

## Practical Example: Live Dashboard

Here's a complete example of a live metrics dashboard that broadcasts system stats:

```go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"math/rand"
	"net/http"
	"sync"
	"time"
)

// Metrics represents system metrics to display on the dashboard
type Metrics struct {
	Timestamp   time.Time `json:"timestamp"`
	CPUUsage    float64   `json:"cpu_usage"`
	MemoryUsage float64   `json:"memory_usage"`
	RequestsPS  int       `json:"requests_per_second"`
	ErrorRate   float64   `json:"error_rate"`
}

// DashboardBroker manages dashboard SSE connections
type DashboardBroker struct {
	clients    map[chan []byte]bool
	register   chan chan []byte
	unregister chan chan []byte
	broadcast  chan []byte
	mu         sync.RWMutex
}

func NewDashboardBroker() *DashboardBroker {
	b := &DashboardBroker{
		clients:    make(map[chan []byte]bool),
		register:   make(chan chan []byte),
		unregister: make(chan chan []byte),
		broadcast:  make(chan []byte, 100),
	}
	go b.run()
	return b
}

func (b *DashboardBroker) run() {
	for {
		select {
		case client := <-b.register:
			b.mu.Lock()
			b.clients[client] = true
			log.Printf("Client connected. Total clients: %d", len(b.clients))
			b.mu.Unlock()

		case client := <-b.unregister:
			b.mu.Lock()
			if _, ok := b.clients[client]; ok {
				delete(b.clients, client)
				close(client)
				log.Printf("Client disconnected. Total clients: %d", len(b.clients))
			}
			b.mu.Unlock()

		case data := <-b.broadcast:
			b.mu.RLock()
			for client := range b.clients {
				select {
				case client <- data:
				default:
					// Skip slow clients
				}
			}
			b.mu.RUnlock()
		}
	}
}

// ServeHTTP handles SSE connections for the dashboard
func (b *DashboardBroker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("Access-Control-Allow-Origin", "*")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Create client channel with buffer
	clientChan := make(chan []byte, 20)
	b.register <- clientChan

	defer func() {
		b.unregister <- clientChan
	}()

	ctx := r.Context()
	
	// Start heartbeat goroutine
	go func() {
		ticker := time.NewTicker(30 * time.Second)
		defer ticker.Stop()
		for {
			select {
			case <-ctx.Done():
				return
			case <-ticker.C:
				fmt.Fprint(w, ": ping\n\n")
				flusher.Flush()
			}
		}
	}()

	for {
		select {
		case <-ctx.Done():
			return
		case data := <-clientChan:
			fmt.Fprintf(w, "event: metrics\ndata: %s\n\n", data)
			flusher.Flush()
		}
	}
}

// generateMetrics simulates collecting system metrics
func generateMetrics() Metrics {
	return Metrics{
		Timestamp:   time.Now(),
		CPUUsage:    30 + rand.Float64()*40,
		MemoryUsage: 50 + rand.Float64()*30,
		RequestsPS:  100 + rand.Intn(500),
		ErrorRate:   rand.Float64() * 5,
	}
}

// startMetricsPublisher sends metrics to all clients every second
func startMetricsPublisher(broker *DashboardBroker) {
	ticker := time.NewTicker(time.Second)
	for range ticker.C {
		metrics := generateMetrics()
		data, _ := json.Marshal(metrics)
		broker.broadcast <- data
	}
}

func main() {
	broker := NewDashboardBroker()
	
	// Start publishing metrics
	go startMetricsPublisher(broker)

	// Serve the SSE endpoint
	http.Handle("/dashboard/events", broker)
	
	// Serve a simple HTML page for testing
	http.HandleFunc("/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/html")
		fmt.Fprint(w, dashboardHTML)
	})

	log.Println("Dashboard server starting on :8080")
	log.Fatal(http.ListenAndServe(":8080", nil))
}

const dashboardHTML = `<!DOCTYPE html>
<html>
<head>
    <title>Live Dashboard</title>
    <style>
        body { font-family: sans-serif; padding: 20px; }
        .metric { margin: 10px 0; padding: 15px; background: #f5f5f5; border-radius: 4px; }
        .value { font-size: 24px; font-weight: bold; color: #333; }
        .label { color: #666; }
    </style>
</head>
<body>
    <h1>Live System Metrics</h1>
    <div class="metric">
        <div class="label">CPU Usage</div>
        <div class="value" id="cpu">-</div>
    </div>
    <div class="metric">
        <div class="label">Memory Usage</div>
        <div class="value" id="memory">-</div>
    </div>
    <div class="metric">
        <div class="label">Requests/sec</div>
        <div class="value" id="requests">-</div>
    </div>
    <div class="metric">
        <div class="label">Error Rate</div>
        <div class="value" id="errors">-</div>
    </div>
    <script>
        const events = new EventSource('/dashboard/events');
        events.addEventListener('metrics', (e) => {
            const data = JSON.parse(e.data);
            document.getElementById('cpu').textContent = data.cpu_usage.toFixed(1) + '%';
            document.getElementById('memory').textContent = data.memory_usage.toFixed(1) + '%';
            document.getElementById('requests').textContent = data.requests_per_second;
            document.getElementById('errors').textContent = data.error_rate.toFixed(2) + '%';
        });
        events.onerror = () => console.log('Connection lost, reconnecting...');
    </script>
</body>
</html>`
```

## Practical Example: Notification System

A notification system with different event types:

```go
package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
)

// Notification represents a single notification
type Notification struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"`
	Title     string    `json:"title"`
	Message   string    `json:"message"`
	Timestamp time.Time `json:"timestamp"`
}

// NotificationBroker handles user-specific notification streams
type NotificationBroker struct {
	// Map of user ID to their notification channels
	userClients map[string]map[chan Notification]bool
	mu          sync.RWMutex
}

func NewNotificationBroker() *NotificationBroker {
	return &NotificationBroker{
		userClients: make(map[string]map[chan Notification]bool),
	}
}

// Subscribe registers a client for a specific user's notifications
func (b *NotificationBroker) Subscribe(userID string) chan Notification {
	b.mu.Lock()
	defer b.mu.Unlock()

	ch := make(chan Notification, 10)
	
	if b.userClients[userID] == nil {
		b.userClients[userID] = make(map[chan Notification]bool)
	}
	b.userClients[userID][ch] = true
	
	return ch
}

// Unsubscribe removes a client from notifications
func (b *NotificationBroker) Unsubscribe(userID string, ch chan Notification) {
	b.mu.Lock()
	defer b.mu.Unlock()

	if clients, ok := b.userClients[userID]; ok {
		delete(clients, ch)
		close(ch)
		
		// Clean up empty user entries
		if len(clients) == 0 {
			delete(b.userClients, userID)
		}
	}
}

// NotifyUser sends a notification to a specific user
func (b *NotificationBroker) NotifyUser(userID string, notification Notification) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	if clients, ok := b.userClients[userID]; ok {
		for ch := range clients {
			select {
			case ch <- notification:
			default:
				// Channel full, skip
			}
		}
	}
}

// NotifyAll broadcasts a notification to all connected users
func (b *NotificationBroker) NotifyAll(notification Notification) {
	b.mu.RLock()
	defer b.mu.RUnlock()

	for _, clients := range b.userClients {
		for ch := range clients {
			select {
			case ch <- notification:
			default:
			}
		}
	}
}

// HandleSSE serves user-specific notification streams
func (b *NotificationBroker) HandleSSE(w http.ResponseWriter, r *http.Request) {
	// Get user ID from query parameter or authentication
	userID := r.URL.Query().Get("user_id")
	if userID == "" {
		http.Error(w, "user_id required", http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "Streaming not supported", http.StatusInternalServerError)
		return
	}

	// Subscribe this client
	ch := b.Subscribe(userID)
	defer b.Unsubscribe(userID, ch)

	ctx := r.Context()

	// Send initial connection confirmation
	fmt.Fprintf(w, "event: connected\ndata: {\"user_id\":\"%s\"}\n\n", userID)
	flusher.Flush()

	for {
		select {
		case <-ctx.Done():
			return
		case notification := <-ch:
			data, _ := json.Marshal(notification)
			// Use notification type as the event name
			fmt.Fprintf(w, "event: %s\nid: %s\ndata: %s\n\n", 
				notification.Type, notification.ID, data)
			flusher.Flush()
		}
	}
}

func main() {
	broker := NewNotificationBroker()

	http.HandleFunc("/notifications", broker.HandleSSE)
	
	// Endpoint to send notifications (in production, protect this)
	http.HandleFunc("/send", func(w http.ResponseWriter, r *http.Request) {
		userID := r.URL.Query().Get("user_id")
		message := r.URL.Query().Get("message")
		
		notification := Notification{
			ID:        fmt.Sprintf("%d", time.Now().UnixNano()),
			Type:      "alert",
			Title:     "New Notification",
			Message:   message,
			Timestamp: time.Now(),
		}
		
		if userID != "" {
			broker.NotifyUser(userID, notification)
		} else {
			broker.NotifyAll(notification)
		}
		
		w.WriteHeader(http.StatusOK)
	})

	log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Scaling Considerations

SSE works great for moderate scale, but there are practical limits to consider.

### Connection Limits

Each SSE connection holds an open HTTP connection. A single Go server can handle thousands of concurrent connections, but you'll hit OS limits eventually:

```bash
# Increase file descriptor limits on Linux
ulimit -n 65535

# Or configure in /etc/security/limits.conf
* soft nofile 65535
* hard nofile 65535
```

### Memory Usage

Each connection consumes memory for the goroutine and channel buffers. Monitor memory usage:

```go
// Add a health endpoint that reports connection stats
http.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
	var m runtime.MemStats
	runtime.ReadMemStats(&m)
	
	stats := map[string]interface{}{
		"connections":   broker.ClientCount(),
		"goroutines":    runtime.NumGoroutine(),
		"memory_alloc":  m.Alloc,
		"memory_sys":    m.Sys,
	}
	
	json.NewEncoder(w).Encode(stats)
})
```

### Multiple Server Instances

For horizontal scaling, you need a pub/sub system to coordinate events across instances. Redis pub/sub is a common choice:

```go
// Simplified example of Redis integration
func subscribeToRedis(broker *Broker) {
	// Create Redis client
	rdb := redis.NewClient(&redis.Options{
		Addr: "localhost:6379",
	})
	
	// Subscribe to events channel
	pubsub := rdb.Subscribe(context.Background(), "events")
	ch := pubsub.Channel()
	
	// Forward Redis messages to SSE broker
	for msg := range ch {
		var event Event
		json.Unmarshal([]byte(msg.Payload), &event)
		broker.Broadcast(event)
	}
}
```

### Load Balancer Configuration

SSE requires sticky sessions or proper handling of long-lived connections. Configure your load balancer:

- **Nginx**: Disable proxy buffering for SSE endpoints
- **HAProxy**: Use `http-server-close` to allow long-lived connections
- **AWS ALB**: Increase idle timeout (default 60 seconds is too short)

Nginx configuration example:

```nginx
location /events {
    proxy_pass http://backend;
    proxy_http_version 1.1;
    proxy_set_header Connection "";
    proxy_buffering off;
    proxy_cache off;
    proxy_read_timeout 86400s;
}
```

## Client-Side Implementation

For completeness, here's the JavaScript side:

```javascript
// Create EventSource connection
const events = new EventSource('/events');

// Handle default "message" events
events.onmessage = (e) => {
    console.log('Message:', e.data);
};

// Handle custom event types
events.addEventListener('notification', (e) => {
    const data = JSON.parse(e.data);
    showNotification(data);
});

events.addEventListener('metrics', (e) => {
    const data = JSON.parse(e.data);
    updateDashboard(data);
});

// Handle connection events
events.onopen = () => {
    console.log('Connected to event stream');
};

events.onerror = (e) => {
    if (events.readyState === EventSource.CLOSED) {
        console.log('Connection closed');
    } else {
        console.log('Connection error, will retry...');
    }
};

// Close connection when done
// events.close();
```

## Error Handling Best Practices

Production code needs proper error handling:

```go
// Wrapper to recover from panics in SSE handlers
func recoverMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if err := recover(); err != nil {
				log.Printf("Panic in SSE handler: %v", err)
				// Connection is likely already broken, just log
			}
		}()
		next.ServeHTTP(w, r)
	})
}

// Graceful shutdown
func gracefulShutdown(server *http.Server, broker *Broker) {
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	
	log.Println("Shutting down server...")
	
	// Give clients time to receive final events
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	// Notify all clients of shutdown
	broker.Broadcast(Event{
		Event: "shutdown",
		Data:  "Server is shutting down",
	})
	
	time.Sleep(time.Second)
	server.Shutdown(ctx)
}
```

## Summary

SSE provides a simple, reliable way to push data from server to client. Go's standard library makes implementation straightforward - set the right headers, use `http.Flusher`, and handle context cancellation for disconnects.

Key points to remember:
- Use SSE for unidirectional server-to-client communication
- Always send heartbeats to keep connections alive through proxies
- Implement event replay for reliable message delivery
- Use channels and a broker pattern for managing multiple clients
- Consider Redis or similar for horizontal scaling

The combination of Go's concurrency model and SSE's simplicity makes building real-time applications surprisingly straightforward.

---

*OneUptime is an open-source observability platform that helps you monitor your applications and infrastructure. With features like uptime monitoring, incident management, and status pages, OneUptime gives you complete visibility into your systems. Check out [OneUptime](https://oneuptime.com) to get started with monitoring your real-time applications.*
