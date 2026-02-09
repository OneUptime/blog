# How to Write a Custom OpenTelemetry Collector Receiver in Go from Scratch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Custom Receiver, Go, Collector Development, SDK

Description: Write a custom OpenTelemetry Collector receiver in Go that ingests telemetry from a proprietary source and converts it to OTLP format.

The OpenTelemetry Collector has dozens of built-in receivers, but sometimes you need to ingest data from a proprietary source that no existing receiver supports. Maybe it is an internal event bus, a legacy monitoring system, or a custom webhook. Writing a custom receiver in Go lets you bring that data into the OTLP ecosystem.

## Project Structure

A collector receiver is a Go module with a specific structure:

```
myreceiver/
    factory.go      # Creates receiver instances from config
    config.go       # Configuration struct
    receiver.go     # The actual receiver logic
    go.mod
    go.sum
```

## Step 1: Define the Configuration

```go
// config.go
package myreceiver

import (
    "go.opentelemetry.io/collector/component"
)

// Config holds the configuration for the receiver
type Config struct {
    // Endpoint to listen on for incoming webhooks
    Endpoint string `mapstructure:"endpoint"`

    // Secret for validating incoming webhook signatures
    Secret string `mapstructure:"secret"`

    // How often to poll (for pull-based receivers)
    PollInterval string `mapstructure:"poll_interval"`
}

// Validate checks if the configuration is valid
func (cfg *Config) Validate() error {
    if cfg.Endpoint == "" {
        return fmt.Errorf("endpoint is required")
    }
    return nil
}
```

## Step 2: Build the Factory

The factory is what the collector uses to instantiate your receiver:

```go
// factory.go
package myreceiver

import (
    "context"
    "time"

    "go.opentelemetry.io/collector/component"
    "go.opentelemetry.io/collector/consumer"
    "go.opentelemetry.io/collector/receiver"
)

const (
    typeStr   = "myreceiver"
    stability = component.StabilityLevelAlpha
)

// NewFactory creates a factory for the receiver
func NewFactory() receiver.Factory {
    return receiver.NewFactory(
        component.MustNewType(typeStr),
        createDefaultConfig,
        receiver.WithTraces(createTracesReceiver, stability),
        receiver.WithLogs(createLogsReceiver, stability),
    )
}

func createDefaultConfig() component.Config {
    return &Config{
        Endpoint:     "0.0.0.0:9999",
        PollInterval: "30s",
    }
}

func createTracesReceiver(
    ctx context.Context,
    settings receiver.Settings,
    cfg component.Config,
    consumer consumer.Traces,
) (receiver.Traces, error) {
    rCfg := cfg.(*Config)
    return newMyReceiver(settings, rCfg, consumer, nil), nil
}

func createLogsReceiver(
    ctx context.Context,
    settings receiver.Settings,
    cfg component.Config,
    consumer consumer.Logs,
) (receiver.Logs, error) {
    rCfg := cfg.(*Config)
    return newMyReceiver(settings, rCfg, nil, consumer), nil
}
```

## Step 3: Implement the Receiver

This is where the real work happens. The receiver starts an HTTP server that accepts webhooks and converts them to OTLP:

```go
// receiver.go
package myreceiver

import (
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"

    "go.opentelemetry.io/collector/component"
    "go.opentelemetry.io/collector/consumer"
    "go.opentelemetry.io/collector/pdata/pcommon"
    "go.opentelemetry.io/collector/pdata/ptrace"
    "go.opentelemetry.io/collector/pdata/plog"
    "go.opentelemetry.io/collector/receiver"
    "go.uber.org/zap"
)

// myReceiver implements the receiver.Traces and receiver.Logs interfaces
type myReceiver struct {
    config        *Config
    logger        *zap.Logger
    traceConsumer consumer.Traces
    logConsumer   consumer.Logs
    server        *http.Server
}

func newMyReceiver(
    settings receiver.Settings,
    cfg *Config,
    traceConsumer consumer.Traces,
    logConsumer consumer.Logs,
) *myReceiver {
    return &myReceiver{
        config:        cfg,
        logger:        settings.Logger,
        traceConsumer: traceConsumer,
        logConsumer:   logConsumer,
    }
}

// Start begins receiving data
func (r *myReceiver) Start(ctx context.Context, host component.Host) error {
    mux := http.NewServeMux()
    mux.HandleFunc("/webhook", r.handleWebhook)

    r.server = &http.Server{
        Addr:    r.config.Endpoint,
        Handler: mux,
    }

    // Start the HTTP server in a goroutine
    go func() {
        r.logger.Info("Starting webhook receiver", zap.String("endpoint", r.config.Endpoint))
        if err := r.server.ListenAndServe(); err != http.ErrServerClosed {
            r.logger.Error("HTTP server error", zap.Error(err))
        }
    }()

    return nil
}

// Shutdown stops the receiver gracefully
func (r *myReceiver) Shutdown(ctx context.Context) error {
    if r.server != nil {
        return r.server.Shutdown(ctx)
    }
    return nil
}

// incomingEvent represents the format your proprietary system sends
type incomingEvent struct {
    EventID   string            `json:"event_id"`
    Timestamp int64             `json:"timestamp_ms"`
    Type      string            `json:"type"`
    Service   string            `json:"service"`
    Duration  int64             `json:"duration_ms"`
    Status    string            `json:"status"`
    Tags      map[string]string `json:"tags"`
    Message   string            `json:"message"`
}

func (r *myReceiver) handleWebhook(w http.ResponseWriter, req *http.Request) {
    if req.Method != http.MethodPost {
        http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
        return
    }

    var event incomingEvent
    if err := json.NewDecoder(req.Body).Decode(&event); err != nil {
        http.Error(w, "Invalid JSON", http.StatusBadRequest)
        return
    }

    ctx := req.Context()

    // Convert to traces if we have a trace consumer
    if r.traceConsumer != nil {
        traces := r.convertToTraces(event)
        if err := r.traceConsumer.ConsumeTraces(ctx, traces); err != nil {
            r.logger.Error("Failed to consume traces", zap.Error(err))
            http.Error(w, "Internal error", http.StatusInternalServerError)
            return
        }
    }

    // Convert to logs if we have a log consumer
    if r.logConsumer != nil && event.Message != "" {
        logs := r.convertToLogs(event)
        if err := r.logConsumer.ConsumeLogs(ctx, logs); err != nil {
            r.logger.Error("Failed to consume logs", zap.Error(err))
            http.Error(w, "Internal error", http.StatusInternalServerError)
            return
        }
    }

    w.WriteHeader(http.StatusOK)
    fmt.Fprint(w, `{"status":"ok"}`)
}

func (r *myReceiver) convertToTraces(event incomingEvent) ptrace.Traces {
    traces := ptrace.NewTraces()
    rs := traces.ResourceSpans().AppendEmpty()

    // Set resource attributes
    resource := rs.Resource()
    resource.Attributes().PutStr("service.name", event.Service)

    // Create a span
    scopeSpans := rs.ScopeSpans().AppendEmpty()
    span := scopeSpans.Spans().AppendEmpty()

    span.SetName(event.Type)
    span.SetStartTimestamp(pcommon.Timestamp(event.Timestamp * 1_000_000))
    span.SetEndTimestamp(pcommon.Timestamp(
        (event.Timestamp + event.Duration) * 1_000_000,
    ))

    // Set status
    if event.Status == "error" {
        span.Status().SetCode(ptrace.StatusCodeError)
        span.Status().SetMessage(event.Message)
    } else {
        span.Status().SetCode(ptrace.StatusCodeOk)
    }

    // Copy tags as span attributes
    for k, v := range event.Tags {
        span.Attributes().PutStr(k, v)
    }

    return traces
}

func (r *myReceiver) convertToLogs(event incomingEvent) plog.Logs {
    logs := plog.NewLogs()
    rl := logs.ResourceLogs().AppendEmpty()
    rl.Resource().Attributes().PutStr("service.name", event.Service)

    logRecord := rl.ScopeLogs().AppendEmpty().LogRecords().AppendEmpty()
    logRecord.Body().SetStr(event.Message)
    logRecord.SetTimestamp(pcommon.Timestamp(event.Timestamp * 1_000_000))

    return logs
}
```

## Step 4: Using the Receiver

Add it to your collector config:

```yaml
receivers:
  myreceiver:
    endpoint: "0.0.0.0:9999"
    secret: "${WEBHOOK_SECRET}"

service:
  pipelines:
    traces:
      receivers: [myreceiver]
      processors: [batch]
      exporters: [otlp]
```

## Testing

```go
// receiver_test.go
func TestHandleWebhook(t *testing.T) {
    consumer := new(consumertest.TracesSink)
    rcv := newMyReceiver(receivertest.NewNopSettings(), &Config{
        Endpoint: "localhost:0",
    }, consumer, nil)

    body := `{"event_id":"123","timestamp_ms":1700000000000,
              "type":"http_request","service":"test-svc",
              "duration_ms":150,"status":"ok","tags":{"env":"prod"}}`

    req := httptest.NewRequest("POST", "/webhook", strings.NewReader(body))
    w := httptest.NewRecorder()

    rcv.handleWebhook(w, req)

    assert.Equal(t, 200, w.Code)
    assert.Equal(t, 1, consumer.SpanCount())
}
```

## Wrapping Up

Building a custom receiver follows a clear pattern: define config, create a factory, implement Start/Shutdown and the data conversion logic. The hardest part is usually mapping your proprietary data format to OTLP's data model correctly. Once done, your custom data source integrates with every processor and exporter in the collector ecosystem.
