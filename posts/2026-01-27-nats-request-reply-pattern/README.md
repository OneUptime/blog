# How to Implement Request-Reply Pattern in NATS

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: NATS, Request-Reply, Messaging, Microservices, RPC

Description: Learn how to implement the request-reply pattern in NATS for synchronous communication between services, including timeouts and error handling.

---

> The request-reply pattern transforms NATS from a simple pub-sub system into a powerful RPC mechanism. It enables synchronous-style communication over an asynchronous messaging backbone, making it ideal for service-to-service calls in microservices architectures.

NATS achieves request-reply through ephemeral inbox subjects. The requester creates a unique inbox, subscribes to it, and includes it as the reply-to address in the request. The responder receives the message and publishes the response to that inbox.

---

## How Request-Reply Works

The pattern involves three components:

1. **Requester** - Sends a message with a reply-to inbox
2. **Responder** - Receives the request and sends a reply
3. **Inbox** - A unique, ephemeral subject for the response

```
Requester                    NATS                     Responder
    |                         |                           |
    |-- Request (reply-to) -->|                           |
    |                         |-- Forward request ------->|
    |                         |                           |
    |                         |<-- Reply to inbox --------|
    |<-- Response ------------|                           |
```

---

## Basic Request-Reply in Go

### Setting Up the Connection

```go
package main

import (
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

func main() {
    // Connect to NATS server
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()

    // Connection is ready for request-reply
    log.Println("Connected to NATS")
}
```

### Implementing a Responder

The responder subscribes to a subject and replies to each request:

```go
// responder.go
package main

import (
    "encoding/json"
    "log"

    "github.com/nats-io/nats.go"
)

// Request and response types
type CalculateRequest struct {
    Operation string  `json:"operation"`
    A         float64 `json:"a"`
    B         float64 `json:"b"`
}

type CalculateResponse struct {
    Result float64 `json:"result"`
    Error  string  `json:"error,omitempty"`
}

func main() {
    nc, _ := nats.Connect(nats.DefaultURL)
    defer nc.Close()

    // Subscribe to calculator requests
    // The subscription handler processes each incoming request
    nc.Subscribe("calculator", func(msg *nats.Msg) {
        var req CalculateRequest
        if err := json.Unmarshal(msg.Data, &req); err != nil {
            // Send error response back to the requester
            sendError(nc, msg.Reply, "invalid request format")
            return
        }

        // Process the request
        resp := processCalculation(req)

        // Marshal and send the response
        data, _ := json.Marshal(resp)

        // Publish response to the reply inbox
        // msg.Reply contains the unique inbox subject
        nc.Publish(msg.Reply, data)
    })

    log.Println("Calculator service running...")
    select {} // Block forever
}

func processCalculation(req CalculateRequest) CalculateResponse {
    var result float64
    var errMsg string

    switch req.Operation {
    case "add":
        result = req.A + req.B
    case "subtract":
        result = req.A - req.B
    case "multiply":
        result = req.A * req.B
    case "divide":
        if req.B == 0 {
            errMsg = "division by zero"
        } else {
            result = req.A / req.B
        }
    default:
        errMsg = "unknown operation"
    }

    return CalculateResponse{Result: result, Error: errMsg}
}

func sendError(nc *nats.Conn, reply, errMsg string) {
    resp := CalculateResponse{Error: errMsg}
    data, _ := json.Marshal(resp)
    nc.Publish(reply, data)
}
```

### Implementing a Requester

The requester sends a message and waits for a reply:

```go
// requester.go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

func main() {
    nc, _ := nats.Connect(nats.DefaultURL)
    defer nc.Close()

    // Create the request
    req := CalculateRequest{
        Operation: "multiply",
        A:         6,
        B:         7,
    }
    data, _ := json.Marshal(req)

    // Send request and wait for reply
    // Request() automatically creates an inbox and handles subscription
    // Timeout of 2 seconds prevents hanging forever
    msg, err := nc.Request("calculator", data, 2*time.Second)
    if err != nil {
        if err == nats.ErrTimeout {
            log.Fatal("Request timed out - no responder available")
        }
        log.Fatal(err)
    }

    // Parse the response
    var resp CalculateResponse
    json.Unmarshal(msg.Data, &resp)

    if resp.Error != "" {
        log.Printf("Error: %s", resp.Error)
    } else {
        fmt.Printf("Result: %.2f\n", resp.Result)
    }
}
```

---

## Request-Reply in Node.js

### Responder Implementation

```javascript
// responder.js
const { connect } = require('nats');

async function main() {
    // Connect to NATS
    const nc = await connect({ servers: 'localhost:4222' });
    console.log('Connected to NATS');

    // Create a subscription for the service
    const sub = nc.subscribe('user.lookup');

    // Process incoming requests
    for await (const msg of sub) {
        try {
            const request = JSON.parse(new TextDecoder().decode(msg.data));
            console.log(`Looking up user: ${request.userId}`);

            // Simulate database lookup
            const user = await lookupUser(request.userId);

            // Send response back to the requester
            // msg.respond() publishes to the reply inbox
            if (msg.reply) {
                const response = JSON.stringify(user);
                msg.respond(new TextEncoder().encode(response));
            }
        } catch (err) {
            // Send error response
            if (msg.reply) {
                const errorResponse = JSON.stringify({ error: err.message });
                msg.respond(new TextEncoder().encode(errorResponse));
            }
        }
    }
}

async function lookupUser(userId) {
    // Simulated user lookup
    const users = {
        'user-1': { id: 'user-1', name: 'Alice', email: 'alice@example.com' },
        'user-2': { id: 'user-2', name: 'Bob', email: 'bob@example.com' },
    };

    if (!users[userId]) {
        throw new Error('User not found');
    }
    return users[userId];
}

main();
```

### Requester Implementation

```javascript
// requester.js
const { connect } = require('nats');

async function main() {
    const nc = await connect({ servers: 'localhost:4222' });

    // Create request payload
    const request = { userId: 'user-1' };
    const data = new TextEncoder().encode(JSON.stringify(request));

    try {
        // Send request with 5 second timeout
        // nc.request() handles inbox creation automatically
        const response = await nc.request('user.lookup', data, { timeout: 5000 });

        const user = JSON.parse(new TextDecoder().decode(response.data));
        console.log('User found:', user);
    } catch (err) {
        if (err.code === 'TIMEOUT') {
            console.error('Request timed out');
        } else {
            console.error('Request failed:', err.message);
        }
    }

    await nc.close();
}

main();
```

---

## Understanding Inbox Subjects

NATS generates unique inbox subjects using the format `_INBOX.<random>`. These subjects are:

- **Ephemeral** - Only exist for the duration of the request
- **Unique** - Generated with enough randomness to avoid collisions
- **Private** - Only the requester subscribes to them

```go
// Manual inbox creation (usually not needed)
inbox := nats.NewInbox()
// Returns something like: _INBOX.22O6nKME5hMSgLLZ0zVDkI

// Subscribe to inbox manually
sub, _ := nc.SubscribeSync(inbox)

// Send request with inbox as reply-to
nc.PublishRequest("service", inbox, requestData)

// Wait for response
msg, _ := sub.NextMsg(2 * time.Second)
```

---

## Timeout Handling

Proper timeout handling is critical for reliable request-reply:

```go
// Set timeout based on expected operation time
func makeRequest(nc *nats.Conn, subject string, data []byte) ([]byte, error) {
    // Use context for more control over cancellation
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // RequestWithContext allows cancellation
    msg, err := nc.RequestWithContext(ctx, subject, data)
    if err != nil {
        if err == context.DeadlineExceeded {
            return nil, fmt.Errorf("request timed out after 5s")
        }
        if err == nats.ErrNoResponders {
            return nil, fmt.Errorf("no service available for %s", subject)
        }
        return nil, err
    }

    return msg.Data, nil
}
```

### Detecting No Responders

NATS 2.2+ can detect when no responders exist:

```go
// Enable no-responders detection
nc, _ := nats.Connect(nats.DefaultURL)

msg, err := nc.Request("nonexistent.service", data, time.Second)
if err == nats.ErrNoResponders {
    // No one is listening on this subject
    log.Println("Service unavailable")
}
```

---

## Multiple Responders and Scatter-Gather

When multiple services subscribe to the same subject, only one receives each request by default. You can collect responses from all responders:

```go
// scatter_gather.go
func scatterGather(nc *nats.Conn, subject string, data []byte, maxWait time.Duration) [][]byte {
    // Create inbox for responses
    inbox := nats.NewInbox()
    responses := make([][]byte, 0)

    // Channel to collect responses
    ch := make(chan *nats.Msg, 100)

    // Subscribe to inbox
    sub, _ := nc.ChanSubscribe(inbox, ch)
    defer sub.Unsubscribe()

    // Publish request to all listeners
    // Using Publish instead of Request sends to ALL subscribers
    nc.PublishRequest(subject, inbox, data)
    nc.Flush()

    // Collect responses until timeout
    timeout := time.After(maxWait)
    for {
        select {
        case msg := <-ch:
            responses = append(responses, msg.Data)
        case <-timeout:
            return responses
        }
    }
}

// Usage: Get prices from multiple vendors
func getPricesFromAllVendors(nc *nats.Conn, productID string) []Price {
    req := PriceRequest{ProductID: productID}
    data, _ := json.Marshal(req)

    // Wait up to 500ms for all responses
    responses := scatterGather(nc, "pricing.quote", data, 500*time.Millisecond)

    var prices []Price
    for _, resp := range responses {
        var price Price
        json.Unmarshal(resp, &price)
        prices = append(prices, price)
    }

    return prices
}
```

---

## Load Balancing with Queue Groups

Queue groups distribute requests across multiple responders for load balancing:

```go
// worker.go - Run multiple instances of this
func main() {
    nc, _ := nats.Connect(nats.DefaultURL)
    defer nc.Close()

    // Subscribe with queue group
    // NATS will load-balance requests across all workers in "workers" group
    nc.QueueSubscribe("tasks.process", "workers", func(msg *nats.Msg) {
        log.Printf("Worker processing task")

        result := processTask(msg.Data)

        nc.Publish(msg.Reply, result)
    })

    select {}
}
```

With queue groups:
- Only ONE subscriber in the group receives each message
- Requests are distributed round-robin
- Adding more workers increases throughput
- Failed workers are automatically bypassed

---

## Error Response Patterns

Define a consistent error response format:

```go
// Standard response wrapper
type Response struct {
    Success bool            `json:"success"`
    Data    json.RawMessage `json:"data,omitempty"`
    Error   *ErrorInfo      `json:"error,omitempty"`
}

type ErrorInfo struct {
    Code    string `json:"code"`
    Message string `json:"message"`
}

// Responder with proper error handling
nc.Subscribe("orders.create", func(msg *nats.Msg) {
    var req CreateOrderRequest
    if err := json.Unmarshal(msg.Data, &req); err != nil {
        sendErrorResponse(nc, msg.Reply, "INVALID_REQUEST", "malformed JSON")
        return
    }

    // Validate request
    if err := validateOrder(req); err != nil {
        sendErrorResponse(nc, msg.Reply, "VALIDATION_ERROR", err.Error())
        return
    }

    // Process request
    order, err := createOrder(req)
    if err != nil {
        sendErrorResponse(nc, msg.Reply, "INTERNAL_ERROR", "failed to create order")
        return
    }

    // Send success response
    sendSuccessResponse(nc, msg.Reply, order)
})

func sendErrorResponse(nc *nats.Conn, reply, code, message string) {
    resp := Response{
        Success: false,
        Error:   &ErrorInfo{Code: code, Message: message},
    }
    data, _ := json.Marshal(resp)
    nc.Publish(reply, data)
}

func sendSuccessResponse(nc *nats.Conn, reply string, data interface{}) {
    payload, _ := json.Marshal(data)
    resp := Response{
        Success: true,
        Data:    payload,
    }
    respData, _ := json.Marshal(resp)
    nc.Publish(reply, respData)
}
```

---

## JetStream Request-Reply

JetStream adds persistence and exactly-once semantics to request-reply:

```go
// Using JetStream for reliable request-reply
func main() {
    nc, _ := nats.Connect(nats.DefaultURL)
    js, _ := nc.JetStream()

    // Create a stream for requests
    js.AddStream(&nats.StreamConfig{
        Name:     "REQUESTS",
        Subjects: []string{"requests.*"},
        Storage:  nats.FileStorage,
    })

    // Create a durable consumer for the responder
    js.AddConsumer("REQUESTS", &nats.ConsumerConfig{
        Durable:       "processor",
        AckPolicy:     nats.AckExplicitPolicy,
        FilterSubject: "requests.process",
    })

    // Responder with explicit acknowledgment
    sub, _ := js.PullSubscribe("requests.process", "processor")

    for {
        msgs, _ := sub.Fetch(10, nats.MaxWait(5*time.Second))
        for _, msg := range msgs {
            // Process request
            result := processRequest(msg.Data)

            // Reply to the original requester
            if msg.Reply != "" {
                nc.Publish(msg.Reply, result)
            }

            // Acknowledge message after successful processing
            msg.Ack()
        }
    }
}
```

### Request-Reply with Headers

JetStream supports headers for metadata:

```go
// Send request with headers
msg := nats.NewMsg("service.action")
msg.Data = requestData
msg.Header.Set("X-Request-ID", "req-12345")
msg.Header.Set("X-Correlation-ID", correlationID)

response, _ := nc.RequestMsg(msg, 5*time.Second)

// Access response headers
requestID := response.Header.Get("X-Request-ID")
```

---

## Best Practices

### 1. Always Set Timeouts
Never use infinite timeouts. Calculate based on expected operation time plus buffer:
```go
// Good: Explicit timeout
nc.Request(subject, data, 5*time.Second)

// Better: Context with timeout for cancellation support
ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
nc.RequestWithContext(ctx, subject, data)
```

### 2. Use Structured Request/Response Types
Define clear contracts between services:
```go
type ServiceRequest struct {
    Version   string          `json:"version"`
    Action    string          `json:"action"`
    RequestID string          `json:"request_id"`
    Payload   json.RawMessage `json:"payload"`
}
```

### 3. Implement Idempotency
Requests may be retried. Design responders to handle duplicates:
```go
nc.Subscribe("orders.create", func(msg *nats.Msg) {
    var req CreateOrderRequest
    json.Unmarshal(msg.Data, &req)

    // Check if request was already processed
    if existing := checkIdempotencyKey(req.IdempotencyKey); existing != nil {
        // Return cached response
        nc.Publish(msg.Reply, existing)
        return
    }

    // Process new request
    result := processOrder(req)

    // Cache response for idempotency
    cacheResponse(req.IdempotencyKey, result)

    nc.Publish(msg.Reply, result)
})
```

### 4. Use Queue Groups for Scalability
```go
// Scale by adding more workers
nc.QueueSubscribe("heavy.processing", "workers", handler)
```

### 5. Monitor Request Latency
Track response times and failures:
```go
start := time.Now()
resp, err := nc.Request(subject, data, timeout)
duration := time.Since(start)

metrics.RecordLatency("nats_request", subject, duration)
if err != nil {
    metrics.IncrementCounter("nats_request_error", subject)
}
```

### 6. Handle Partial Failures
In scatter-gather, some responders may fail:
```go
responses := scatterGather(nc, subject, data, timeout)
if len(responses) < minimumRequired {
    return errors.New("insufficient responses")
}
```

---

## Summary

| Feature | Use Case |
|---------|----------|
| Basic Request-Reply | Simple RPC calls |
| Queue Groups | Load-balanced services |
| Scatter-Gather | Aggregate from multiple sources |
| JetStream | Persistent, exactly-once delivery |
| Timeouts | Prevent hanging requests |
| Headers | Pass metadata and tracing info |

---

## Conclusion

The request-reply pattern in NATS provides a robust foundation for synchronous service communication. Key points:

- **Inboxes** handle response routing automatically
- **Timeouts** prevent resource exhaustion
- **Queue groups** enable horizontal scaling
- **Structured errors** improve debugging
- **JetStream** adds persistence when needed

The pattern works well for service-to-service RPC, aggregating data from multiple sources, and building scalable microservice architectures.

---

*Building microservices with NATS? [OneUptime](https://oneuptime.com) provides end-to-end observability for your messaging infrastructure, with distributed tracing and real-time alerting.*
