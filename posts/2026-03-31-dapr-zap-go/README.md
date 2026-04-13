# How to Use Dapr with Zap in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Zap, Go, Logging, Performance

Description: Use Uber's Zap logger with Dapr Go SDK for high-performance structured logging with zero-allocation fields and distributed trace context propagation.

---

## Why Zap for Dapr Go Services?

Uber's `zap` library is optimized for high-performance scenarios where logging overhead matters. It offers two APIs: the `Logger` (strongly typed, zero allocations) and the `SugaredLogger` (convenient, small overhead). For Dapr services processing high volumes of pub/sub events, `zap` significantly reduces GC pressure compared to Logrus.

```bash
# Install dependencies
go mod init dapr-zap-demo
go get go.uber.org/zap
go get go.uber.org/zap/zapcore
go get github.com/dapr/go-sdk/client
go get github.com/dapr/go-sdk/service/http
```

## Zap Logger Initialization

```go
// logger/zap.go
package logger

import (
    "os"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

var Logger *zap.Logger

func init() {
    env := os.Getenv("APP_ENV")

    var cfg zap.Config
    if env == "production" {
        cfg = zap.NewProductionConfig()
        cfg.EncoderConfig.TimeKey = "timestamp"
        cfg.EncoderConfig.EncodeTime = zapcore.ISO8601TimeEncoder
    } else {
        cfg = zap.NewDevelopmentConfig()
        cfg.EncoderConfig.EncodeLevel = zapcore.CapitalColorLevelEncoder
    }

    cfg.InitialFields = map[string]interface{}{
        "service": os.Getenv("APP_ID"),
    }

    var err error
    Logger, err = cfg.Build(
        zap.AddCallerSkip(0),
        zap.AddStacktrace(zapcore.ErrorLevel),
    )
    if err != nil {
        panic("failed to initialize zap logger: " + err.Error())
    }
}

// DaprFields returns zap fields for Dapr request context
func DaprFields(traceParent, callerAppID string) []zap.Field {
    return []zap.Field{
        zap.String("traceParent", traceParent),
        zap.String("callerAppId", callerAppID),
    }
}
```

## Dapr Service with Zap Logging

```go
// main.go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"

    dapr "github.com/dapr/go-sdk/client"
    "github.com/dapr/go-sdk/service/common"
    daprd "github.com/dapr/go-sdk/service/http"
    "go.uber.org/zap"
    "myapp/logger"
)

type Order struct {
    OrderID    string  `json:"orderId"`
    CustomerID string  `json:"customerId"`
    Amount     float64 `json:"amount"`
}

func main() {
    defer logger.Logger.Sync()

    s := daprd.NewService(":6001")
    s.AddServiceInvocationHandler("/api/orders", handleOrder)
    s.AddTopicEventHandler(&common.Subscription{
        PubsubName: "pubsub",
        Topic:      "payments",
        Route:      "/events/payments",
    }, handlePaymentEvent)

    logger.Logger.Info("Starting service", zap.String("port", "6001"))

    if err := s.Start(); err != nil && err != http.ErrServerClosed {
        logger.Logger.Fatal("Service failed", zap.Error(err))
    }
}

func handleOrder(ctx context.Context, in *common.InvocationEvent) (*common.Content, error) {
    fields := logger.DaprFields("", "")
    log := logger.Logger.With(fields...)

    var order Order
    if err := json.Unmarshal(in.Data, &order); err != nil {
        log.Error("Invalid order payload", zap.Error(err))
        return nil, fmt.Errorf("invalid payload: %w", err)
    }

    log = log.With(
        zap.String("orderId", order.OrderID),
        zap.String("customerId", order.CustomerID),
        zap.Float64("amount", order.Amount),
    )

    log.Info("Processing order")

    client, err := dapr.NewClient()
    if err != nil {
        log.Error("Failed to create Dapr client", zap.Error(err))
        return nil, err
    }
    defer client.Close()

    if err := client.SaveState(ctx, "statestore", "order-"+order.OrderID, in.Data, nil); err != nil {
        log.Error("State save failed", zap.Error(err))
        return nil, err
    }

    log.Info("Order saved", zap.String("stateKey", "order-"+order.OrderID))

    if err := client.PublishEvent(ctx, "pubsub", "order-created", order); err != nil {
        log.Warn("Failed to publish event", zap.Error(err))
    }

    log.Info("Order processed successfully")
    return &common.Content{
        ContentType: "application/json",
        Data:        []byte(`{"status":"created"}`),
    }, nil
}

func handlePaymentEvent(ctx context.Context, e *common.TopicEvent) (bool, error) {
    log := logger.Logger.With(
        zap.String("eventId", e.ID),
        zap.String("topic", e.Topic),
        zap.String("traceParent", e.TraceParent),
    )
    log.Info("Processing payment event")
    // process...
    log.Info("Payment event handled")
    return false, nil
}
```

## Using the Sugared Logger for Convenience

```go
// For less performance-critical code paths
sugar := logger.Logger.Sugar()

sugar.Infow("Order status updated",
    "orderId", orderID,
    "oldStatus", "pending",
    "newStatus", "fulfilled",
    "traceId", traceID,
)

sugar.Errorw("Payment failed",
    "orderId", orderID,
    "reason", err.Error(),
)
```

## Summary

Zap provides the best logging performance for high-throughput Dapr Go services, with zero-allocation structured fields and configurable encoders for development and production. By using `Logger.With()` to pre-populate Dapr context fields at the start of each handler, you avoid repetitive field specification while maintaining full correlation context across all log entries in a request or event handler.
