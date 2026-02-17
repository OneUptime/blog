# How to Write and Deploy Go Cloud Functions Gen 2 with the Functions Framework for Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Cloud Functions, Go, Serverless, Functions Framework

Description: Write and deploy Go Cloud Functions Gen 2 using the Functions Framework for Go, covering HTTP triggers, CloudEvent triggers, local testing, and deployment patterns.

---

Cloud Functions Gen 2 is built on Cloud Run under the hood, which means you get better performance, longer timeouts, and more configuration options compared to Gen 1. The Functions Framework for Go provides a clean way to write functions that work both locally and when deployed to Cloud Functions. You write standard Go code with a specific function signature, and the framework handles the rest.

In this post, I will walk through building and deploying Go Cloud Functions Gen 2 with both HTTP and event triggers.

## Project Setup

Initialize a Go module and add the Functions Framework:

```bash
# Create the project directory and initialize the module
mkdir my-function && cd my-function
go mod init example.com/my-function

# Add the Functions Framework dependency
go get github.com/GoogleCloudPlatform/functions-framework-go
```

Your project structure looks like this:

```
my-function/
    go.mod
    go.sum
    function.go       # Your function code
    cmd/main.go       # Local development entry point
```

## Writing an HTTP Function

An HTTP function receives a standard `http.ResponseWriter` and `*http.Request`. Register it with the Functions Framework using `init()`:

```go
// function.go - HTTP-triggered Cloud Function
package myfunction

import (
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"

    "github.com/GoogleCloudPlatform/functions-framework-go/functions"
)

// Register the function during package initialization
func init() {
    functions.HTTP("HandleRequest", HandleRequest)
}

// Request body structure
type TaskRequest struct {
    Title       string `json:"title"`
    Description string `json:"description"`
    Priority    string `json:"priority"`
}

// Response structure
type TaskResponse struct {
    ID        string    `json:"id"`
    Title     string    `json:"title"`
    Status    string    `json:"status"`
    CreatedAt time.Time `json:"created_at"`
}

// HandleRequest processes incoming HTTP requests
func HandleRequest(w http.ResponseWriter, r *http.Request) {
    // Set response content type
    w.Header().Set("Content-Type", "application/json")

    switch r.Method {
    case http.MethodPost:
        handleCreate(w, r)
    case http.MethodGet:
        handleList(w, r)
    default:
        http.Error(w, `{"error": "method not allowed"}`, http.StatusMethodNotAllowed)
    }
}

func handleCreate(w http.ResponseWriter, r *http.Request) {
    var req TaskRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        log.Printf("Error decoding request: %v", err)
        http.Error(w, `{"error": "invalid request body"}`, http.StatusBadRequest)
        return
    }

    // Validate required fields
    if req.Title == "" {
        http.Error(w, `{"error": "title is required"}`, http.StatusBadRequest)
        return
    }

    // Create the response
    resp := TaskResponse{
        ID:        fmt.Sprintf("task-%d", time.Now().UnixNano()),
        Title:     req.Title,
        Status:    "created",
        CreatedAt: time.Now(),
    }

    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(resp)
}

func handleList(w http.ResponseWriter, r *http.Request) {
    // Return a sample list
    tasks := []TaskResponse{
        {ID: "task-1", Title: "Sample Task", Status: "pending", CreatedAt: time.Now()},
    }
    json.NewEncoder(w).Encode(tasks)
}
```

## Writing a CloudEvent Function

CloudEvent functions are triggered by events from Pub/Sub, Cloud Storage, Firestore, and other GCP services:

```go
// event_function.go - CloudEvent-triggered function
package myfunction

import (
    "context"
    "fmt"
    "log"

    "github.com/GoogleCloudPlatform/functions-framework-go/functions"
    "github.com/cloudevents/sdk-go/v2/event"
)

// Register the CloudEvent function
func init() {
    functions.CloudEvent("ProcessStorageEvent", ProcessStorageEvent)
}

// StorageObjectData represents the data payload from a Cloud Storage event
type StorageObjectData struct {
    Bucket         string `json:"bucket"`
    Name           string `json:"name"`
    ContentType    string `json:"contentType"`
    Size           string `json:"size"`
    TimeCreated    string `json:"timeCreated"`
    MetaGeneration string `json:"metageneration"`
}

// ProcessStorageEvent handles Cloud Storage events
func ProcessStorageEvent(ctx context.Context, e event.Event) error {
    log.Printf("Received event: %s", e.Type())
    log.Printf("Event ID: %s", e.ID())
    log.Printf("Event Source: %s", e.Source())

    // Parse the event data
    var data StorageObjectData
    if err := e.DataAs(&data); err != nil {
        return fmt.Errorf("failed to parse event data: %w", err)
    }

    log.Printf("Processing file: gs://%s/%s", data.Bucket, data.Name)
    log.Printf("Content type: %s, Size: %s", data.ContentType, data.Size)

    // Process the file based on its type
    switch data.ContentType {
    case "text/csv":
        return processCSV(ctx, data.Bucket, data.Name)
    case "application/json":
        return processJSON(ctx, data.Bucket, data.Name)
    default:
        log.Printf("Skipping unsupported content type: %s", data.ContentType)
        return nil
    }
}

func processCSV(ctx context.Context, bucket, name string) error {
    log.Printf("Processing CSV file: %s/%s", bucket, name)
    // Your CSV processing logic here
    return nil
}

func processJSON(ctx context.Context, bucket, name string) error {
    log.Printf("Processing JSON file: %s/%s", bucket, name)
    // Your JSON processing logic here
    return nil
}
```

## Pub/Sub Event Function

Handle Pub/Sub messages:

```go
// pubsub_function.go - Pub/Sub-triggered function
package myfunction

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    "github.com/GoogleCloudPlatform/functions-framework-go/functions"
    "github.com/cloudevents/sdk-go/v2/event"
)

func init() {
    functions.CloudEvent("ProcessPubSubMessage", ProcessPubSubMessage)
}

// PubSubMessage represents the Pub/Sub message structure in a CloudEvent
type PubSubMessage struct {
    Message struct {
        Data       []byte            `json:"data"`
        Attributes map[string]string `json:"attributes"`
        MessageID  string            `json:"messageId"`
    } `json:"message"`
}

// OrderEvent is the decoded message payload
type OrderEvent struct {
    OrderID    string  `json:"order_id"`
    CustomerID string  `json:"customer_id"`
    Amount     float64 `json:"amount"`
    Action     string  `json:"action"`
}

// ProcessPubSubMessage handles incoming Pub/Sub messages
func ProcessPubSubMessage(ctx context.Context, e event.Event) error {
    var msg PubSubMessage
    if err := e.DataAs(&msg); err != nil {
        return fmt.Errorf("failed to parse Pub/Sub message: %w", err)
    }

    // Decode the base64-encoded message data
    var order OrderEvent
    if err := json.Unmarshal(msg.Message.Data, &order); err != nil {
        return fmt.Errorf("failed to decode order event: %w", err)
    }

    log.Printf("Processing order: %s for customer: %s (amount: $%.2f)",
        order.OrderID, order.CustomerID, order.Amount)

    // Process based on action type
    switch order.Action {
    case "create":
        return handleOrderCreated(ctx, order)
    case "cancel":
        return handleOrderCancelled(ctx, order)
    default:
        log.Printf("Unknown action: %s", order.Action)
        return nil
    }
}

func handleOrderCreated(ctx context.Context, order OrderEvent) error {
    log.Printf("Order created: %s", order.OrderID)
    // Process the order
    return nil
}

func handleOrderCancelled(ctx context.Context, order OrderEvent) error {
    log.Printf("Order cancelled: %s", order.OrderID)
    // Handle cancellation
    return nil
}
```

## Local Development and Testing

Create a local entry point for development:

```go
// cmd/main.go - local development server
package main

import (
    "log"
    "os"

    // Import your function package to trigger init() registration
    _ "example.com/my-function"

    "github.com/GoogleCloudPlatform/functions-framework-go/funcframework"
)

func main() {
    // Set the port (default 8080)
    port := os.Getenv("PORT")
    if port == "" {
        port = "8080"
    }

    // Start the Functions Framework local server
    log.Printf("Starting function server on port %s", port)
    if err := funcframework.Start(port); err != nil {
        log.Fatalf("Failed to start: %v", err)
    }
}
```

Run the function locally:

```bash
# Start the local development server
go run cmd/main.go

# Test the HTTP function
curl -X POST http://localhost:8080 \
    -H "Content-Type: application/json" \
    -d '{"title": "Test Task", "description": "A test", "priority": "high"}'
```

## Writing Unit Tests

```go
// function_test.go
package myfunction

import (
    "bytes"
    "encoding/json"
    "net/http"
    "net/http/httptest"
    "testing"
)

func TestHandleRequest_Create(t *testing.T) {
    // Create a request body
    body := TaskRequest{
        Title:       "Test Task",
        Description: "A test task",
        Priority:    "high",
    }
    bodyBytes, _ := json.Marshal(body)

    // Create the HTTP request
    req := httptest.NewRequest(http.MethodPost, "/", bytes.NewReader(bodyBytes))
    req.Header.Set("Content-Type", "application/json")

    // Record the response
    recorder := httptest.NewRecorder()

    // Call the function
    HandleRequest(recorder, req)

    // Verify the response
    if recorder.Code != http.StatusCreated {
        t.Errorf("Expected status 201, got %d", recorder.Code)
    }

    var resp TaskResponse
    json.NewDecoder(recorder.Body).Decode(&resp)

    if resp.Title != "Test Task" {
        t.Errorf("Expected title 'Test Task', got '%s'", resp.Title)
    }
}
```

## Deploying to Cloud Functions Gen 2

```bash
# Deploy the HTTP function
gcloud functions deploy handle-request \
    --gen2 \
    --runtime go121 \
    --trigger-http \
    --entry-point HandleRequest \
    --source . \
    --region us-central1 \
    --memory 256Mi \
    --timeout 60s \
    --allow-unauthenticated

# Deploy the Cloud Storage event function
gcloud functions deploy process-storage \
    --gen2 \
    --runtime go121 \
    --trigger-event-filters="type=google.cloud.storage.object.v1.finalized" \
    --trigger-event-filters="bucket=my-upload-bucket" \
    --entry-point ProcessStorageEvent \
    --source . \
    --region us-central1 \
    --memory 256Mi

# Deploy the Pub/Sub function
gcloud functions deploy process-orders \
    --gen2 \
    --runtime go121 \
    --trigger-topic=orders-topic \
    --entry-point ProcessPubSubMessage \
    --source . \
    --region us-central1 \
    --memory 256Mi
```

## Environment Variables and Secrets

```bash
# Deploy with environment variables
gcloud functions deploy my-function \
    --gen2 \
    --runtime go121 \
    --trigger-http \
    --entry-point HandleRequest \
    --set-env-vars "API_KEY=abc123,LOG_LEVEL=info" \
    --source . \
    --region us-central1

# Use Secret Manager for sensitive values
gcloud functions deploy my-function \
    --gen2 \
    --runtime go121 \
    --trigger-http \
    --entry-point HandleRequest \
    --set-secrets "DB_PASSWORD=db-password:latest" \
    --source . \
    --region us-central1
```

## Wrapping Up

Cloud Functions Gen 2 with the Functions Framework for Go gives you a serverless platform with a clean Go programming model. HTTP functions use the standard `http.Handler` pattern, so your code is portable. CloudEvent functions handle events from Cloud Storage, Pub/Sub, and other GCP services with typed event payloads. The Functions Framework handles the server lifecycle both locally and in production. Deploy with `gcloud functions deploy`, pick your trigger type, and you have a production-ready serverless function with minimal boilerplate.
