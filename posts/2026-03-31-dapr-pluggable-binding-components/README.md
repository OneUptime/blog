# How to Develop Dapr Pluggable Binding Components

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Pluggable Component, Binding, gRPC, Extension

Description: Create custom Dapr input and output binding components using the pluggable component SDK to connect Dapr to external systems not in the built-in catalog.

---

## Dapr Bindings and Pluggability

Dapr bindings connect your application to external systems - both for receiving events (input bindings) and triggering external actions (output bindings). When no built-in binding exists for your system (a legacy mainframe, a proprietary IoT platform), pluggable bindings let you implement the interface yourself.

## Project Initialization

```bash
mkdir dapr-custom-binding && cd dapr-custom-binding
go mod init github.com/myorg/dapr-custom-binding
go get github.com/dapr-sandbox/components-go-sdk@latest
```

## Implementing the Output Binding

Output bindings respond to application-initiated operations:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"

    dapr "github.com/dapr-sandbox/components-go-sdk"
    "github.com/dapr/components-contrib/bindings"
)

type WebhookBinding struct {
    webhookURL string
}

func (b *WebhookBinding) Init(ctx context.Context, metadata bindings.Metadata) error {
    if v, ok := metadata.Properties["webhookURL"]; ok {
        b.webhookURL = v
    }
    log.Printf("Webhook binding initialized with URL: %s", b.webhookURL)
    return nil
}

func (b *WebhookBinding) Operations() []bindings.OperationKind {
    return []bindings.OperationKind{"send", "delete"}
}

func (b *WebhookBinding) Invoke(ctx context.Context, req *bindings.InvokeRequest) (*bindings.InvokeResponse, error) {
    switch req.Operation {
    case "send":
        // Send to webhook
        payload := map[string]interface{}{
            "data": string(req.Data),
        }
        body, _ := json.Marshal(payload)
        log.Printf("Sending to webhook %s: %s", b.webhookURL, body)
        return &bindings.InvokeResponse{Data: []byte(`{"status": "sent"}`)}, nil
    default:
        return nil, fmt.Errorf("unsupported operation: %s", req.Operation)
    }
}

func (b *WebhookBinding) Close() error {
    return nil
}
```

## Implementing the Input Binding

Input bindings deliver events to your application from external sources:

```go
type WebhookInputBinding struct {
    webhookURL string
}

func (b *WebhookInputBinding) Init(ctx context.Context, metadata bindings.Metadata) error {
    if v, ok := metadata.Properties["webhookURL"]; ok {
        b.webhookURL = v
    }
    return nil
}

func (b *WebhookInputBinding) Read(ctx context.Context, handler bindings.Handler) error {
    // Start an HTTP server to receive webhook events
    go b.startHTTPServer(ctx, handler)

    <-ctx.Done()
    return nil
}

func (b *WebhookInputBinding) startHTTPServer(ctx context.Context, handler bindings.Handler) {
    // Accept incoming webhooks and forward to Dapr
    http.HandleFunc("/webhook", func(w http.ResponseWriter, r *http.Request) {
        body, _ := io.ReadAll(r.Body)
        _, err := handler(r.Context(), &bindings.ReadResponse{
            ContentType: "application/json",
            Data:        body,
        })
        if err != nil {
            w.WriteHeader(http.StatusInternalServerError)
            return
        }
        w.WriteHeader(http.StatusOK)
    })
    http.ListenAndServe(":9000", nil)
}

func (b *WebhookInputBinding) Close() error {
    return nil
}
```

## Registering Both Binding Types

```go
func main() {
    dapr.Register("custom-webhook",
        dapr.WithOutputBinding(func() bindings.OutputBinding {
            return &WebhookBinding{}
        }),
        dapr.WithInputBinding(func() bindings.InputBinding {
            return &WebhookInputBinding{}
        }),
    )

    dapr.MustRun()
}
```

## Component Manifest

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: webhook-binding
spec:
  type: bindings.custom-webhook
  version: v1
  metadata:
    - name: webhookURL
      value: "https://hooks.example.com/events"
    - name: direction
      value: "input, output"
```

## Using the Output Binding

```bash
# Invoke the output binding from your app
curl -X POST http://localhost:3500/v1.0/bindings/webhook-binding \
  -H "Content-Type: application/json" \
  -d '{"data": {"event": "order.created", "orderId": "456"}, "operation": "send"}'
```

## Summary

Dapr pluggable binding components enable bidirectional integration with any external system through a clean gRPC interface. Output bindings let your application trigger actions on external systems, while input bindings push external events into your app without polling. Combined with Dapr's built-in resiliency and tracing, pluggable bindings make legacy system integration straightforward.
