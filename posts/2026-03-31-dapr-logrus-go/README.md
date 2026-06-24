# How to Use Dapr with Logrus in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Logrus, Go, Logging, Observability

Description: Integrate Logrus structured logging with Dapr Go SDK services, propagating W3C trace headers and Dapr app context through all log entries.

---

## Logrus and Dapr Go SDK

Logrus is a widely used structured logging library for Go that supports log levels, custom formatters, and hooks. When building Dapr microservices in Go, Logrus helps you emit consistent, correlated log entries from service invocations, state operations, and pub/sub handlers.

```bash
# Initialize Go module and install dependencies
go mod init dapr-logrus-demo
go get github.com/dapr/go-sdk/client
go get github.com/dapr/go-sdk/service/http
go get github.com/sirupsen/logrus
```

## Logger Configuration

```go
// logger/logger.go
package logger

import (
    "os"
    "github.com/sirupsen/logrus"
)

var Log *logrus.Logger

func init() {
    Log = logrus.New()
    Log.SetOutput(os.Stdout)
    Log.SetFormatter(&logrus.JSONFormatter{
        TimestampFormat: "2006-01-02T15:04:05Z07:00",
        FieldMap: logrus.FieldMap{
            logrus.FieldKeyTime:  "timestamp",
            logrus.FieldKeyLevel: "level",
            logrus.FieldKeyMsg:   "message",
        },
    })

    level, err := logrus.ParseLevel(os.Getenv("LOG_LEVEL"))
    if err != nil {
        level = logrus.InfoLevel
    }
    Log.SetLevel(level)
}

// WithDaprContext creates a log entry with Dapr service context fields
func WithDaprContext(appID, method string) *logrus.Entry {
    return Log.WithFields(logrus.Fields{
        "service": appID,
        "method":  method,
    })
}
```

## Dapr HTTP Service with Logrus

```go
// main.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "os"

    dapr "github.com/dapr/go-sdk/client"
    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
    "github.com/sirupsen/logrus"
    "myapp/logger"
)

func main() {
    s := daprd.NewService(":6001")

    s.AddServiceInvocationHandler("/api/orders", orderHandler)
    s.AddTopicEventHandler(&common.Subscription{
        PubsubName: "pubsub",
        Topic:      "order-created",
        Route:      "/events/order-created",
    }, orderEventHandler)

    logger.Log.WithField("port", 6001).Info("Starting Dapr service")

    if err := s.Start(); err != nil && err != http.ErrServerClosed {
        logger.Log.WithError(err).Fatal("Service failed to start")
    }
}

func orderHandler(ctx context.Context, in *common.InvocationEvent) (out *common.Content, err error) {
    log := logger.WithDaprContext(
        os.Getenv("APP_ID"),
        in.Verb,
    )

    var order map[string]interface{}
    if err := json.Unmarshal(in.Data, &order); err != nil {
        log.WithError(err).Error("Failed to parse order request")
        return nil, fmt.Errorf("invalid order payload: %w", err)
    }

    orderID := order["orderId"].(string)
    log = log.WithField("orderId", orderID)
    log.Info("Processing order")

    client, err := dapr.NewClient()
    if err != nil {
        log.WithError(err).Error("Failed to create Dapr client")
        return nil, err
    }
    defer client.Close()

    if err := client.SaveState(ctx, "statestore", "order-"+orderID, in.Data, nil); err != nil {
        log.WithError(err).Error("Failed to save order state")
        return nil, err
    }

    log.Info("Order saved successfully")
    return &common.Content{ContentType: "application/json",
        Data: []byte(`{"status":"created"}`)}, nil
}

func orderEventHandler(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    log := logger.Log.WithFields(logrus.Fields{
        "eventId":   e.ID,
        "eventType": e.Type,
        "topic":     e.Topic,
    })

    log.Info("Received order event")

    // Process event...
    log.Info("Order event processed successfully")
    return false, nil
}
```

## Logrus Hook for External Log Shipping

```go
// hooks/datadog_hook.go
package hooks

import (
    "bytes"
    "net/http"
    "github.com/sirupsen/logrus"
)

type DatadogHook struct {
    APIKey   string
    Endpoint string
    client   *http.Client
}

func (h *DatadogHook) Levels() []logrus.Level {
    return []logrus.Level{logrus.ErrorLevel, logrus.WarnLevel}
}

func (h *DatadogHook) Fire(entry *logrus.Entry) error {
    line, _ := entry.Bytes()
    req, _ := http.NewRequest("POST", h.Endpoint, bytes.NewBuffer(line))
    req.Header.Set("DD-API-KEY", h.APIKey)
    req.Header.Set("Content-Type", "application/json")
    _, err := h.client.Do(req)
    return err
}
```

## Summary

Logrus integrates with Dapr Go services through structured log entries that carry Dapr-specific context fields. By creating a `WithDaprContext` helper that pre-populates common fields like app identifiers and request metadata, every log statement in your service automatically maintains correlation context. Use Logrus hooks to ship error logs to external platforms like Datadog or Splunk without changing application code.
