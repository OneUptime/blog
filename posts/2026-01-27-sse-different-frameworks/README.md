# How to Implement SSE with Different Frameworks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SSE, Server-Sent Events, Real-time, Express, FastAPI, Spring Boot, Gin, Rails, EventSource

Description: Learn how to implement Server-Sent Events in various frameworks including Express, FastAPI, Spring Boot, Gin, and Rails with practical code examples for real-time data streaming.

---

> Server-Sent Events provide a simple, HTTP-based approach to push data from server to client. Unlike WebSockets, SSE works over standard HTTP, handles reconnection automatically, and requires no special protocol upgrade.

Server-Sent Events (SSE) is a standard that enables servers to push real-time updates to web clients over a single HTTP connection. It is ideal for scenarios like live notifications, dashboards, log streaming, and real-time feeds where data flows primarily from server to client.

This guide covers SSE implementation across five popular frameworks with production-ready code examples.

---

## SSE Protocol Basics

SSE uses a simple text-based format over HTTP. The server responds with `Content-Type: text/event-stream` and sends events as plain text.

### Event Format

```
event: message
id: 12345
retry: 5000
data: {"user": "john", "action": "login"}

event: notification
id: 12346
data: New comment on your post

```

Key fields:
- **data**: The actual payload (required). Multiple `data:` lines are concatenated with newlines.
- **event**: Event type name. Client can listen for specific types. Defaults to "message".
- **id**: Event identifier for reconnection. Client sends `Last-Event-ID` header on reconnect.
- **retry**: Reconnection time in milliseconds. Client waits this long before reconnecting.

Each event ends with two newlines (`\n\n`). A single newline separates fields within an event.

---

## SSE with Express.js (Node.js)

Express handles SSE naturally since it is just a long-lived HTTP response with specific headers.

```javascript
// server.js - Express SSE implementation
const express = require('express');
const app = express();

// Store connected clients for broadcasting
const clients = new Map();
let clientId = 0;

// SSE endpoint
app.get('/events', (req, res) => {
    // Set headers for SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Disable response buffering (important for nginx)
    res.setHeader('X-Accel-Buffering', 'no');

    // Send initial connection event
    const id = ++clientId;
    res.write(`event: connected\nid: ${id}\ndata: {"clientId": ${id}}\n\n`);

    // Store client for broadcasting
    clients.set(id, res);

    // Handle client disconnect
    req.on('close', () => {
        clients.delete(id);
        console.log(`Client ${id} disconnected`);
    });

    // Send heartbeat every 30 seconds to keep connection alive
    const heartbeat = setInterval(() => {
        res.write(': heartbeat\n\n');
    }, 30000);

    req.on('close', () => clearInterval(heartbeat));
});

// Broadcast to all connected clients
function broadcast(event, data) {
    const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const [id, client] of clients) {
        client.write(payload);
    }
}

// Example: endpoint that triggers events
app.post('/notify', express.json(), (req, res) => {
    broadcast('notification', req.body);
    res.json({ sent: clients.size });
});

app.listen(3000, () => console.log('SSE server on port 3000'));
```

### Handling Last-Event-ID for Reconnection

```javascript
// server.js - With event history for reconnection
const eventHistory = [];
const MAX_HISTORY = 1000;

app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Check for reconnection
    const lastEventId = req.headers['last-event-id'];
    if (lastEventId) {
        // Send missed events
        const missedEvents = eventHistory.filter(e => e.id > parseInt(lastEventId));
        for (const event of missedEvents) {
            res.write(`event: ${event.type}\nid: ${event.id}\ndata: ${JSON.stringify(event.data)}\n\n`);
        }
    }

    // Set retry interval (3 seconds)
    res.write('retry: 3000\n\n');

    // ... rest of connection handling
});

function broadcastWithHistory(type, data) {
    const id = Date.now();
    const event = { id, type, data };

    // Store in history
    eventHistory.push(event);
    if (eventHistory.length > MAX_HISTORY) {
        eventHistory.shift();
    }

    // Send to clients
    const payload = `event: ${type}\nid: ${id}\ndata: ${JSON.stringify(data)}\n\n`;
    for (const client of clients.values()) {
        client.write(payload);
    }
}
```

---

## SSE with FastAPI (Python)

FastAPI uses async generators with `StreamingResponse` for SSE.

```python
# main.py - FastAPI SSE implementation
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from asyncio import Queue, create_task, sleep
from typing import Dict
import json
import time

app = FastAPI()

# Store connected clients
clients: Dict[int, Queue] = {}
client_counter = 0

async def event_generator(client_id: int, request: Request):
    """Generate SSE events for a client."""
    queue = clients[client_id]

    # Send connection event
    yield f"event: connected\nid: {client_id}\ndata: {json.dumps({'clientId': client_id})}\n\n"

    # Set retry interval
    yield "retry: 3000\n\n"

    try:
        while True:
            # Check if client disconnected
            if await request.is_disconnected():
                break

            # Wait for message with timeout (for heartbeat)
            try:
                # Non-blocking check for new messages
                if not queue.empty():
                    message = await queue.get()
                    yield message
                else:
                    # Send heartbeat comment every 30 seconds
                    yield ": heartbeat\n\n"
                    await sleep(30)
            except Exception:
                break
    finally:
        # Cleanup on disconnect
        if client_id in clients:
            del clients[client_id]

@app.get("/events")
async def sse_endpoint(request: Request):
    global client_counter
    client_counter += 1
    client_id = client_counter

    # Create queue for this client
    clients[client_id] = Queue()

    return StreamingResponse(
        event_generator(client_id, request),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",  # Disable nginx buffering
        }
    )

async def broadcast(event_type: str, data: dict):
    """Send event to all connected clients."""
    event_id = int(time.time() * 1000)
    message = f"event: {event_type}\nid: {event_id}\ndata: {json.dumps(data)}\n\n"

    for queue in clients.values():
        await queue.put(message)

@app.post("/notify")
async def notify(data: dict):
    await broadcast("notification", data)
    return {"sent": len(clients)}
```

### Using asyncio for Better Performance

```python
# main.py - Improved FastAPI SSE with asyncio events
from fastapi import FastAPI, Request
from fastapi.responses import StreamingResponse
from asyncio import Event, wait_for, TimeoutError as AsyncTimeoutError
from contextlib import asynccontextmanager
import json
import time

app = FastAPI()

class SSEManager:
    """Manages SSE connections and broadcasting."""

    def __init__(self):
        self.clients: dict = {}
        self.counter = 0

    def add_client(self) -> int:
        self.counter += 1
        self.clients[self.counter] = {
            "messages": [],
            "event": Event()
        }
        return self.counter

    def remove_client(self, client_id: int):
        if client_id in self.clients:
            del self.clients[client_id]

    async def send(self, client_id: int, event_type: str, data: dict):
        if client_id in self.clients:
            event_id = int(time.time() * 1000)
            message = f"event: {event_type}\nid: {event_id}\ndata: {json.dumps(data)}\n\n"
            self.clients[client_id]["messages"].append(message)
            self.clients[client_id]["event"].set()

    async def broadcast(self, event_type: str, data: dict):
        for client_id in list(self.clients.keys()):
            await self.send(client_id, event_type, data)

manager = SSEManager()

async def event_stream(client_id: int, request: Request):
    """Generate events with efficient waiting."""
    client = manager.clients.get(client_id)
    if not client:
        return

    yield f"event: connected\ndata: {json.dumps({'clientId': client_id})}\n\n"
    yield "retry: 3000\n\n"

    try:
        while True:
            if await request.is_disconnected():
                break

            try:
                # Wait for event or timeout after 30s for heartbeat
                await wait_for(client["event"].wait(), timeout=30.0)
                client["event"].clear()

                # Send all pending messages
                while client["messages"]:
                    yield client["messages"].pop(0)

            except AsyncTimeoutError:
                yield ": heartbeat\n\n"
    finally:
        manager.remove_client(client_id)

@app.get("/events")
async def events(request: Request):
    client_id = manager.add_client()
    return StreamingResponse(
        event_stream(client_id, request),
        media_type="text/event-stream"
    )
```

---

## SSE with Spring Boot (Java)

Spring Boot provides `SseEmitter` for SSE support.

```java
// SseController.java - Spring Boot SSE implementation
package com.example.sse;

import org.springframework.http.MediaType;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.Map;
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicLong;

@RestController
public class SseController {

    // Store connected clients
    private final Map<Long, SseEmitter> clients = new ConcurrentHashMap<>();
    private final AtomicLong clientIdCounter = new AtomicLong(0);

    // Executor for async operations
    private final ScheduledExecutorService heartbeatExecutor =
        Executors.newScheduledThreadPool(1);

    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter streamEvents() {
        // Timeout of 0 means no timeout (connection stays open)
        SseEmitter emitter = new SseEmitter(0L);
        long clientId = clientIdCounter.incrementAndGet();

        // Store client
        clients.put(clientId, emitter);

        // Handle completion and errors
        emitter.onCompletion(() -> clients.remove(clientId));
        emitter.onTimeout(() -> clients.remove(clientId));
        emitter.onError(e -> clients.remove(clientId));

        // Send connection event
        try {
            emitter.send(SseEmitter.event()
                .name("connected")
                .id(String.valueOf(clientId))
                .data(Map.of("clientId", clientId)));

            // Set retry interval
            emitter.send(SseEmitter.event()
                .reconnectTime(3000));
        } catch (IOException e) {
            emitter.completeWithError(e);
        }

        // Schedule heartbeat every 30 seconds
        ScheduledFuture<?> heartbeat = heartbeatExecutor.scheduleAtFixedRate(() -> {
            try {
                emitter.send(SseEmitter.event().comment("heartbeat"));
            } catch (IOException e) {
                clients.remove(clientId);
            }
        }, 30, 30, TimeUnit.SECONDS);

        // Cancel heartbeat on disconnect
        emitter.onCompletion(() -> heartbeat.cancel(true));

        return emitter;
    }

    @PostMapping("/notify")
    public Map<String, Integer> notify(@RequestBody Map<String, Object> data) {
        broadcast("notification", data);
        return Map.of("sent", clients.size());
    }

    private void broadcast(String eventName, Object data) {
        clients.forEach((id, emitter) -> {
            try {
                emitter.send(SseEmitter.event()
                    .name(eventName)
                    .id(String.valueOf(System.currentTimeMillis()))
                    .data(data));
            } catch (IOException e) {
                clients.remove(id);
            }
        });
    }
}
```

### Using Spring WebFlux for Reactive SSE

```java
// ReactiveSseController.java - WebFlux SSE implementation
package com.example.sse;

import org.springframework.http.MediaType;
import org.springframework.http.codec.ServerSentEvent;
import org.springframework.web.bind.annotation.*;
import reactor.core.publisher.Flux;
import reactor.core.publisher.Sinks;

import java.time.Duration;
import java.util.Map;

@RestController
public class ReactiveSseController {

    // Sink for broadcasting events to all subscribers
    private final Sinks.Many<ServerSentEvent<Map<String, Object>>> sink =
        Sinks.many().multicast().onBackpressureBuffer();

    @GetMapping(path = "/events", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public Flux<ServerSentEvent<Map<String, Object>>> streamEvents() {
        // Merge broadcast events with heartbeat
        Flux<ServerSentEvent<Map<String, Object>>> events = sink.asFlux();

        Flux<ServerSentEvent<Map<String, Object>>> heartbeat = Flux.interval(Duration.ofSeconds(30))
            .map(seq -> ServerSentEvent.<Map<String, Object>>builder()
                .comment("heartbeat")
                .build());

        // Send initial connection event
        ServerSentEvent<Map<String, Object>> connected = ServerSentEvent.<Map<String, Object>>builder()
            .event("connected")
            .data(Map.of("status", "connected"))
            .retry(Duration.ofSeconds(3))
            .build();

        return Flux.concat(
            Flux.just(connected),
            Flux.merge(events, heartbeat)
        );
    }

    @PostMapping("/notify")
    public Map<String, String> notify(@RequestBody Map<String, Object> data) {
        ServerSentEvent<Map<String, Object>> event = ServerSentEvent.<Map<String, Object>>builder()
            .event("notification")
            .id(String.valueOf(System.currentTimeMillis()))
            .data(data)
            .build();

        sink.tryEmitNext(event);
        return Map.of("status", "sent");
    }
}
```

---

## SSE with Gin (Go)

Go's standard library makes SSE straightforward. Gin adds routing convenience.

```go
// main.go - Gin SSE implementation
package main

import (
    "fmt"
    "net/http"
    "sync"
    "sync/atomic"
    "time"

    "github.com/gin-gonic/gin"
)

// Client represents a connected SSE client
type Client struct {
    ID      uint64
    Channel chan string
}

// SSEBroker manages client connections
type SSEBroker struct {
    clients    map[uint64]*Client
    mu         sync.RWMutex
    idCounter  uint64
}

func NewSSEBroker() *SSEBroker {
    return &SSEBroker{
        clients: make(map[uint64]*Client),
    }
}

func (b *SSEBroker) AddClient() *Client {
    id := atomic.AddUint64(&b.idCounter, 1)
    client := &Client{
        ID:      id,
        Channel: make(chan string, 100), // Buffered channel
    }

    b.mu.Lock()
    b.clients[id] = client
    b.mu.Unlock()

    return client
}

func (b *SSEBroker) RemoveClient(id uint64) {
    b.mu.Lock()
    if client, ok := b.clients[id]; ok {
        close(client.Channel)
        delete(b.clients, id)
    }
    b.mu.Unlock()
}

func (b *SSEBroker) Broadcast(eventType, data string) {
    message := fmt.Sprintf("event: %s\nid: %d\ndata: %s\n\n",
        eventType, time.Now().UnixMilli(), data)

    b.mu.RLock()
    for _, client := range b.clients {
        select {
        case client.Channel <- message:
        default:
            // Channel full, skip this client
        }
    }
    b.mu.RUnlock()
}

var broker = NewSSEBroker()

func main() {
    r := gin.Default()

    // SSE endpoint
    r.GET("/events", func(c *gin.Context) {
        client := broker.AddClient()
        defer broker.RemoveClient(client.ID)

        // Set SSE headers
        c.Header("Content-Type", "text/event-stream")
        c.Header("Cache-Control", "no-cache")
        c.Header("Connection", "keep-alive")
        c.Header("X-Accel-Buffering", "no")

        // Send connection event
        c.SSEvent("connected", gin.H{"clientId": client.ID})

        // Set retry interval
        fmt.Fprintf(c.Writer, "retry: 3000\n\n")
        c.Writer.Flush()

        // Create heartbeat ticker
        heartbeat := time.NewTicker(30 * time.Second)
        defer heartbeat.Stop()

        clientGone := c.Request.Context().Done()

        for {
            select {
            case <-clientGone:
                return
            case msg, ok := <-client.Channel:
                if !ok {
                    return
                }
                fmt.Fprint(c.Writer, msg)
                c.Writer.Flush()
            case <-heartbeat.C:
                fmt.Fprint(c.Writer, ": heartbeat\n\n")
                c.Writer.Flush()
            }
        }
    })

    // Broadcast endpoint
    r.POST("/notify", func(c *gin.Context) {
        var data map[string]interface{}
        if err := c.BindJSON(&data); err != nil {
            c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
            return
        }

        // Convert to JSON string
        jsonData, _ := json.Marshal(data)
        broker.Broadcast("notification", string(jsonData))

        c.JSON(http.StatusOK, gin.H{"sent": len(broker.clients)})
    })

    r.Run(":3000")
}
```

### With Last-Event-ID Support

```go
// main.go - SSE with event history
package main

import (
    "container/ring"
    "fmt"
    "strconv"
    "sync"
    "time"

    "github.com/gin-gonic/gin"
)

type Event struct {
    ID   int64
    Type string
    Data string
}

type EventStore struct {
    events *ring.Ring
    mu     sync.RWMutex
}

func NewEventStore(size int) *EventStore {
    return &EventStore{
        events: ring.New(size),
    }
}

func (s *EventStore) Add(event Event) {
    s.mu.Lock()
    s.events.Value = event
    s.events = s.events.Next()
    s.mu.Unlock()
}

func (s *EventStore) GetSince(lastID int64) []Event {
    var events []Event
    s.mu.RLock()
    s.events.Do(func(v interface{}) {
        if e, ok := v.(Event); ok && e.ID > lastID {
            events = append(events, e)
        }
    })
    s.mu.RUnlock()
    return events
}

var eventStore = NewEventStore(1000)

func sseHandler(c *gin.Context) {
    // Check for reconnection
    lastEventID := c.GetHeader("Last-Event-ID")
    if lastEventID != "" {
        id, _ := strconv.ParseInt(lastEventID, 10, 64)
        // Send missed events
        for _, event := range eventStore.GetSince(id) {
            fmt.Fprintf(c.Writer, "event: %s\nid: %d\ndata: %s\n\n",
                event.Type, event.ID, event.Data)
        }
        c.Writer.Flush()
    }

    // Continue with normal SSE handling...
}
```

---

## SSE with Rails (Ruby)

Rails uses ActionController::Live for SSE support.

```ruby
# app/controllers/events_controller.rb - Rails SSE implementation
class EventsController < ApplicationController
  include ActionController::Live

  # Thread-safe client storage
  @@clients = Concurrent::Map.new
  @@client_counter = Concurrent::AtomicFixnum.new(0)

  def stream
    # Set SSE headers
    response.headers['Content-Type'] = 'text/event-stream'
    response.headers['Cache-Control'] = 'no-cache'
    response.headers['Connection'] = 'keep-alive'
    response.headers['X-Accel-Buffering'] = 'no'

    # Create client
    client_id = @@client_counter.increment
    queue = Queue.new
    @@clients[client_id] = queue

    # Send connection event
    sse = SSE.new(response.stream, event: 'connected')
    sse.write({ clientId: client_id })

    # Set retry interval
    response.stream.write("retry: 3000\n\n")

    # Handle Last-Event-ID for reconnection
    if request.headers['Last-Event-ID'].present?
      last_id = request.headers['Last-Event-ID'].to_i
      replay_events(response.stream, last_id)
    end

    # Main event loop
    loop do
      begin
        # Wait for message with timeout (for heartbeat)
        message = queue.pop(true) rescue nil

        if message
          response.stream.write(message)
        else
          # Send heartbeat
          response.stream.write(": heartbeat\n\n")
        end

        sleep 1
      rescue ActionController::Live::ClientDisconnected
        break
      rescue IOError
        break
      end
    end
  ensure
    @@clients.delete(client_id)
    response.stream.close
  end

  def notify
    data = params.permit!.to_h
    broadcast('notification', data)
    render json: { sent: @@clients.size }
  end

  private

  def broadcast(event_type, data)
    event_id = (Time.now.to_f * 1000).to_i
    message = "event: #{event_type}\nid: #{event_id}\ndata: #{data.to_json}\n\n"

    # Store in event history
    EventHistory.add(event_id, event_type, data)

    @@clients.each_value do |queue|
      queue.push(message) rescue nil
    end
  end

  def replay_events(stream, last_id)
    EventHistory.since(last_id).each do |event|
      stream.write("event: #{event[:type]}\nid: #{event[:id]}\ndata: #{event[:data].to_json}\n\n")
    end
  end
end

# app/services/event_history.rb - Simple event storage
class EventHistory
  @@events = []
  @@mutex = Mutex.new
  MAX_SIZE = 1000

  def self.add(id, type, data)
    @@mutex.synchronize do
      @@events << { id: id, type: type, data: data }
      @@events.shift if @@events.size > MAX_SIZE
    end
  end

  def self.since(last_id)
    @@mutex.synchronize do
      @@events.select { |e| e[:id] > last_id }
    end
  end
end
```

### Using Rails with Turbo Streams

```ruby
# app/controllers/events_controller.rb - Modern Rails with Turbo
class EventsController < ApplicationController
  include ActionController::Live

  def stream
    response.headers['Content-Type'] = 'text/event-stream'
    response.headers['Cache-Control'] = 'no-cache'

    sse = SSE.new(response.stream, retry: 3000)

    # Subscribe to Action Cable broadcast
    ActiveSupport::Notifications.subscribe('sse.broadcast') do |*args|
      event = ActiveSupport::Notifications::Event.new(*args)
      sse.write(event.payload[:data], event: event.payload[:type])
    end

    loop do
      sse.write({ time: Time.now.iso8601 }, event: 'heartbeat')
      sleep 30
    end
  rescue IOError, ActionController::Live::ClientDisconnected
    # Client disconnected
  ensure
    response.stream.close
  end
end

# Broadcast from anywhere
ActiveSupport::Notifications.instrument('sse.broadcast',
  type: 'notification',
  data: { message: 'Hello' }
)
```

---

## Client-Side EventSource API

The browser's EventSource API provides automatic reconnection and event handling.

```javascript
// client.js - EventSource client implementation
class SSEClient {
    constructor(url, options = {}) {
        this.url = url;
        this.options = options;
        this.eventSource = null;
        this.listeners = new Map();
        this.reconnectAttempts = 0;
        this.maxReconnectAttempts = options.maxReconnectAttempts || 10;
    }

    connect() {
        // Create EventSource with optional credentials
        this.eventSource = new EventSource(this.url, {
            withCredentials: this.options.withCredentials || false
        });

        // Handle connection open
        this.eventSource.onopen = (event) => {
            console.log('SSE connected');
            this.reconnectAttempts = 0;
            this.emit('open', event);
        };

        // Handle generic messages (event type "message")
        this.eventSource.onmessage = (event) => {
            this.handleMessage('message', event);
        };

        // Handle errors and reconnection
        this.eventSource.onerror = (event) => {
            console.error('SSE error:', event);
            this.emit('error', event);

            // EventSource auto-reconnects, but we track attempts
            if (this.eventSource.readyState === EventSource.CLOSED) {
                this.handleReconnect();
            }
        };

        // Add custom event listeners
        for (const [eventType, handler] of this.listeners) {
            this.eventSource.addEventListener(eventType, handler);
        }
    }

    // Listen for specific event types
    on(eventType, callback) {
        const handler = (event) => {
            let data = event.data;
            try {
                data = JSON.parse(event.data);
            } catch (e) {
                // Keep as string if not JSON
            }
            callback(data, event);
        };

        this.listeners.set(eventType, handler);

        if (this.eventSource) {
            this.eventSource.addEventListener(eventType, handler);
        }

        return this;
    }

    // Remove event listener
    off(eventType) {
        const handler = this.listeners.get(eventType);
        if (handler && this.eventSource) {
            this.eventSource.removeEventListener(eventType, handler);
        }
        this.listeners.delete(eventType);
        return this;
    }

    handleMessage(type, event) {
        let data = event.data;
        try {
            data = JSON.parse(event.data);
        } catch (e) {
            // Not JSON
        }
        this.emit(type, { data, lastEventId: event.lastEventId });
    }

    handleReconnect() {
        this.reconnectAttempts++;
        if (this.reconnectAttempts > this.maxReconnectAttempts) {
            console.error('Max reconnection attempts reached');
            this.emit('maxReconnect');
            return;
        }

        // Exponential backoff
        const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);
        console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

        setTimeout(() => this.connect(), delay);
    }

    emit(event, data) {
        if (this.options[`on${event}`]) {
            this.options[`on${event}`](data);
        }
    }

    close() {
        if (this.eventSource) {
            this.eventSource.close();
            this.eventSource = null;
        }
    }

    // Get connection state
    get readyState() {
        return this.eventSource?.readyState ?? EventSource.CLOSED;
    }
}

// Usage
const client = new SSEClient('/events', {
    withCredentials: true,
    maxReconnectAttempts: 5,
    onopen: () => console.log('Connected!'),
    onerror: (e) => console.error('Error:', e)
});

// Listen for specific events
client
    .on('connected', (data) => {
        console.log('Client ID:', data.clientId);
    })
    .on('notification', (data) => {
        console.log('Notification:', data);
        showNotification(data.message);
    })
    .on('update', (data) => {
        updateDashboard(data);
    });

client.connect();

// Clean up on page unload
window.addEventListener('beforeunload', () => client.close());
```

---

## Handling Reconnection

The `Last-Event-ID` mechanism ensures clients can recover missed events.

### Server-Side Event Store Pattern

```javascript
// eventStore.js - Generic event store for any framework
class EventStore {
    constructor(maxSize = 1000, ttlMs = 300000) {
        this.events = [];
        this.maxSize = maxSize;
        this.ttlMs = ttlMs;

        // Clean old events periodically
        setInterval(() => this.cleanup(), 60000);
    }

    add(type, data) {
        const event = {
            id: Date.now().toString(),
            type,
            data,
            timestamp: Date.now()
        };

        this.events.push(event);

        // Trim if over max size
        if (this.events.length > this.maxSize) {
            this.events = this.events.slice(-this.maxSize);
        }

        return event;
    }

    getSince(lastEventId) {
        if (!lastEventId) return [];

        const lastId = parseInt(lastEventId);
        return this.events.filter(e => parseInt(e.id) > lastId);
    }

    cleanup() {
        const cutoff = Date.now() - this.ttlMs;
        this.events = this.events.filter(e => e.timestamp > cutoff);
    }

    formatEvent(event) {
        return `event: ${event.type}\nid: ${event.id}\ndata: ${JSON.stringify(event.data)}\n\n`;
    }
}
```

### Client-Side Reconnection with State Recovery

```javascript
// client-reconnect.js - Robust reconnection handling
class RobustSSEClient {
    constructor(url) {
        this.url = url;
        this.lastEventId = localStorage.getItem('sse-last-event-id');
        this.pendingUpdates = [];
        this.isProcessing = false;
    }

    connect() {
        // Include last event ID in URL if available
        const connectUrl = this.lastEventId
            ? `${this.url}?lastEventId=${this.lastEventId}`
            : this.url;

        this.eventSource = new EventSource(connectUrl);

        this.eventSource.onmessage = (event) => {
            // Update last event ID
            if (event.lastEventId) {
                this.lastEventId = event.lastEventId;
                localStorage.setItem('sse-last-event-id', event.lastEventId);
            }

            // Queue update for processing
            this.queueUpdate(event.data);
        };
    }

    queueUpdate(data) {
        this.pendingUpdates.push(data);
        this.processQueue();
    }

    async processQueue() {
        if (this.isProcessing) return;
        this.isProcessing = true;

        while (this.pendingUpdates.length > 0) {
            const data = this.pendingUpdates.shift();
            try {
                await this.handleUpdate(JSON.parse(data));
            } catch (e) {
                console.error('Failed to process update:', e);
            }
        }

        this.isProcessing = false;
    }

    async handleUpdate(data) {
        // Override in subclass
    }
}
```

---

## Load Balancer Considerations

SSE connections require special handling in load-balanced environments.

### Sticky Sessions Configuration

**Nginx:**
```nginx
upstream backend {
    ip_hash;  # Sticky sessions based on client IP
    server backend1:3000;
    server backend2:3000;
}

server {
    location /events {
        proxy_pass http://backend;

        # SSE-specific settings
        proxy_http_version 1.1;
        proxy_set_header Connection '';
        proxy_buffering off;
        proxy_cache off;

        # Increase timeouts for long-lived connections
        proxy_read_timeout 86400s;
        proxy_send_timeout 86400s;

        # Pass headers for reconnection
        proxy_set_header Last-Event-ID $http_last_event_id;
    }
}
```

**HAProxy:**
```
frontend http
    bind *:80
    default_backend servers

backend servers
    balance source  # Sticky by source IP
    option http-server-close
    timeout server 86400s
    timeout tunnel 86400s

    server server1 backend1:3000 check
    server server2 backend2:3000 check
```

### Pub/Sub for Multi-Instance Broadcasting

When running multiple server instances, use a message broker to synchronize events.

```javascript
// redis-broadcast.js - Redis pub/sub for SSE
const Redis = require('ioredis');
const express = require('express');

const app = express();
const publisher = new Redis();
const subscriber = new Redis();

const clients = new Map();

// Subscribe to broadcast channel
subscriber.subscribe('sse-broadcast');
subscriber.on('message', (channel, message) => {
    // Forward to all local clients
    const event = JSON.parse(message);
    const payload = `event: ${event.type}\nid: ${event.id}\ndata: ${JSON.stringify(event.data)}\n\n`;

    for (const client of clients.values()) {
        client.write(payload);
    }
});

app.get('/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');

    const clientId = Date.now();
    clients.set(clientId, res);

    req.on('close', () => clients.delete(clientId));
});

app.post('/notify', express.json(), async (req, res) => {
    const event = {
        type: 'notification',
        id: Date.now(),
        data: req.body
    };

    // Publish to Redis - all instances receive it
    await publisher.publish('sse-broadcast', JSON.stringify(event));

    res.json({ status: 'published' });
});
```

---

## Best Practices Summary

| Practice | Description |
|----------|-------------|
| Use heartbeats | Send periodic comments (`: heartbeat\n\n`) to detect dead connections |
| Set retry interval | Configure `retry:` to control client reconnection timing |
| Track event IDs | Use sequential IDs and store recent events for reconnection recovery |
| Handle Last-Event-ID | Check header and replay missed events on reconnection |
| Disable buffering | Set `X-Accel-Buffering: no` for nginx and similar headers for other proxies |
| Use sticky sessions | Configure load balancer for IP-based or cookie-based affinity |
| Implement pub/sub | Use Redis or similar for multi-instance deployments |
| Buffer events | Use queues or channels to handle slow clients without blocking |
| Set proper timeouts | Configure long timeouts on proxies and servers |
| Clean up resources | Remove disconnected clients promptly to avoid memory leaks |

---

## When to Use SSE vs WebSocket

| Use SSE When | Use WebSocket When |
|--------------|-------------------|
| Data flows primarily server-to-client | Bidirectional communication needed |
| You want automatic reconnection | You need binary data support |
| HTTP/2 multiplexing is beneficial | Sub-second latency is critical |
| Simpler implementation is preferred | Complex real-time protocols needed |
| Working with HTTP infrastructure | Custom protocol required |

SSE is ideal for dashboards, notifications, live feeds, log streaming, and status updates. For chat applications, collaborative editing, or gaming, WebSocket is typically more appropriate.

---

*Monitor your SSE endpoints and track connection health with [OneUptime](https://oneuptime.com) - open-source observability for real-time applications.*
