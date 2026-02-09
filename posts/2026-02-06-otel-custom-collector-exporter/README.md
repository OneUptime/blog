# How to Create a Custom Collector Exporter That Writes to Your Proprietary Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Custom Exporter, Go, Proprietary Backend, Collector

Description: Create a custom OpenTelemetry Collector exporter in Go that writes traces and logs to your proprietary backend API with authentication and batching.

When your backend does not speak OTLP, Zipkin, Jaeger, or any other standard protocol, you need a custom exporter. Maybe your company has a legacy monitoring system with a REST API, or an internal analytics platform that expects a specific JSON schema. A custom exporter translates OTLP data into whatever format your backend requires.

## Exporter Anatomy

An exporter receives processed telemetry data and sends it somewhere. It needs to handle:

- Data format conversion (OTLP to your backend's format)
- Network communication (HTTP, gRPC, TCP, etc.)
- Authentication
- Error handling and retries
- Graceful shutdown

## Project Structure

```
myexporter/
    factory.go
    config.go
    exporter.go
    go.mod
```

## Step 1: Configuration

```go
// config.go
package myexporter

import (
    "fmt"
    "go.opentelemetry.io/collector/config/confighttp"
)

type Config struct {
    // Embed the standard HTTP client config for TLS, auth, etc.
    confighttp.ClientConfig `mapstructure:",squash"`

    // Your backend's API endpoint
    APIEndpoint string `mapstructure:"api_endpoint"`

    // API key for authentication
    APIKey string `mapstructure:"api_key"`

    // Project identifier in your backend
    ProjectID string `mapstructure:"project_id"`

    // Maximum number of items per API call
    MaxBatchSize int `mapstructure:"max_batch_size"`
}

func (c *Config) Validate() error {
    if c.APIEndpoint == "" {
        return fmt.Errorf("api_endpoint is required")
    }
    if c.APIKey == "" {
        return fmt.Errorf("api_key is required")
    }
    if c.MaxBatchSize <= 0 {
        c.MaxBatchSize = 100
    }
    return nil
}
```

## Step 2: Factory

```go
// factory.go
package myexporter

import (
    "context"

    "go.opentelemetry.io/collector/component"
    "go.opentelemetry.io/collector/exporter"
    "go.opentelemetry.io/collector/exporter/exporterhelper"
)

const (
    typeStr   = "mybackend"
    stability = component.StabilityLevelAlpha
)

func NewFactory() exporter.Factory {
    return exporter.NewFactory(
        component.MustNewType(typeStr),
        createDefaultConfig,
        exporter.WithTraces(createTracesExporter, stability),
        exporter.WithLogs(createLogsExporter, stability),
    )
}

func createDefaultConfig() component.Config {
    return &Config{
        MaxBatchSize: 100,
    }
}

func createTracesExporter(
    ctx context.Context,
    settings exporter.Settings,
    cfg component.Config,
) (exporter.Traces, error) {
    eCfg := cfg.(*Config)
    exp, err := newMyExporter(settings, eCfg)
    if err != nil {
        return nil, err
    }

    // Use exporterhelper for built-in retry, queue, and timeout support
    return exporterhelper.NewTraces(
        ctx,
        settings,
        cfg,
        exp.pushTraces,
        exporterhelper.WithRetry(exporterhelper.RetrySettings{
            Enabled:         true,
            InitialInterval: 5 * time.Second,
            MaxInterval:     30 * time.Second,
        }),
        exporterhelper.WithQueue(exporterhelper.QueueConfig{
            Enabled:   true,
            QueueSize: 1000,
        }),
        exporterhelper.WithTimeout(exporterhelper.TimeoutConfig{
            Timeout: 30 * time.Second,
        }),
        exporterhelper.WithStart(exp.start),
        exporterhelper.WithShutdown(exp.shutdown),
    )
}

func createLogsExporter(
    ctx context.Context,
    settings exporter.Settings,
    cfg component.Config,
) (exporter.Logs, error) {
    eCfg := cfg.(*Config)
    exp, err := newMyExporter(settings, eCfg)
    if err != nil {
        return nil, err
    }

    return exporterhelper.NewLogs(
        ctx, settings, cfg, exp.pushLogs,
        exporterhelper.WithRetry(exporterhelper.RetrySettings{Enabled: true}),
        exporterhelper.WithQueue(exporterhelper.QueueConfig{Enabled: true}),
    )
}
```

## Step 3: Exporter Implementation

```go
// exporter.go
package myexporter

import (
    "bytes"
    "context"
    "encoding/json"
    "fmt"
    "net/http"
    "time"

    "go.opentelemetry.io/collector/component"
    "go.opentelemetry.io/collector/exporter"
    "go.opentelemetry.io/collector/pdata/ptrace"
    "go.opentelemetry.io/collector/pdata/plog"
    "go.uber.org/zap"
)

// backendEvent is the format your proprietary backend expects
type backendEvent struct {
    ProjectID  string            `json:"project_id"`
    EventType  string            `json:"event_type"`
    Timestamp  int64             `json:"timestamp_epoch_ms"`
    Name       string            `json:"name"`
    Duration   int64             `json:"duration_ms"`
    Service    string            `json:"service"`
    Status     string            `json:"status"`
    Attributes map[string]string `json:"attributes"`
    Message    string            `json:"message,omitempty"`
}

type myExporter struct {
    config *Config
    logger *zap.Logger
    client *http.Client
}

func newMyExporter(settings exporter.Settings, cfg *Config) (*myExporter, error) {
    return &myExporter{
        config: cfg,
        logger: settings.Logger,
    }, nil
}

func (e *myExporter) start(ctx context.Context, host component.Host) error {
    e.client = &http.Client{
        Timeout: 30 * time.Second,
    }
    e.logger.Info("My exporter started",
        zap.String("endpoint", e.config.APIEndpoint))
    return nil
}

func (e *myExporter) shutdown(ctx context.Context) error {
    if e.client != nil {
        e.client.CloseIdleConnections()
    }
    return nil
}

func (e *myExporter) pushTraces(ctx context.Context, td ptrace.Traces) error {
    events := make([]backendEvent, 0)

    // Convert OTLP traces to backend format
    rss := td.ResourceSpans()
    for i := 0; i < rss.Len(); i++ {
        rs := rss.At(i)
        serviceName := ""
        if sn, ok := rs.Resource().Attributes().Get("service.name"); ok {
            serviceName = sn.AsString()
        }

        ilss := rs.ScopeSpans()
        for j := 0; j < ilss.Len(); j++ {
            spans := ilss.At(j).Spans()
            for k := 0; k < spans.Len(); k++ {
                span := spans.At(k)

                // Build the attribute map
                attrs := make(map[string]string)
                span.Attributes().Range(func(key string, val pcommon.Value) bool {
                    attrs[key] = val.AsString()
                    return true
                })

                // Calculate duration in milliseconds
                durationNs := span.EndTimestamp() - span.StartTimestamp()
                durationMs := int64(durationNs) / 1_000_000

                status := "ok"
                if span.Status().Code() == ptrace.StatusCodeError {
                    status = "error"
                }

                events = append(events, backendEvent{
                    ProjectID:  e.config.ProjectID,
                    EventType:  "trace",
                    Timestamp:  int64(span.StartTimestamp()) / 1_000_000,
                    Name:       span.Name(),
                    Duration:   durationMs,
                    Service:    serviceName,
                    Status:     status,
                    Attributes: attrs,
                })
            }
        }
    }

    // Send in batches
    return e.sendBatch(ctx, events)
}

func (e *myExporter) pushLogs(ctx context.Context, ld plog.Logs) error {
    events := make([]backendEvent, 0)

    rls := ld.ResourceLogs()
    for i := 0; i < rls.Len(); i++ {
        rl := rls.At(i)
        serviceName := ""
        if sn, ok := rl.Resource().Attributes().Get("service.name"); ok {
            serviceName = sn.AsString()
        }

        slls := rl.ScopeLogs()
        for j := 0; j < slls.Len(); j++ {
            logs := slls.At(j).LogRecords()
            for k := 0; k < logs.Len(); k++ {
                log := logs.At(k)
                events = append(events, backendEvent{
                    ProjectID: e.config.ProjectID,
                    EventType: "log",
                    Timestamp: int64(log.Timestamp()) / 1_000_000,
                    Service:   serviceName,
                    Message:   log.Body().AsString(),
                })
            }
        }
    }

    return e.sendBatch(ctx, events)
}

func (e *myExporter) sendBatch(ctx context.Context, events []backendEvent) error {
    // Send in chunks of MaxBatchSize
    for i := 0; i < len(events); i += e.config.MaxBatchSize {
        end := i + e.config.MaxBatchSize
        if end > len(events) {
            end = len(events)
        }
        chunk := events[i:end]

        body, err := json.Marshal(chunk)
        if err != nil {
            return fmt.Errorf("failed to marshal events: %w", err)
        }

        req, err := http.NewRequestWithContext(
            ctx, "POST", e.config.APIEndpoint+"/v1/events", bytes.NewReader(body),
        )
        if err != nil {
            return fmt.Errorf("failed to create request: %w", err)
        }

        req.Header.Set("Content-Type", "application/json")
        req.Header.Set("Authorization", "Bearer "+e.config.APIKey)

        resp, err := e.client.Do(req)
        if err != nil {
            return fmt.Errorf("failed to send events: %w", err)
        }
        resp.Body.Close()

        if resp.StatusCode >= 400 {
            return fmt.Errorf("backend returned status %d", resp.StatusCode)
        }
    }

    return nil
}
```

## Using the Exporter

```yaml
exporters:
  mybackend:
    api_endpoint: "https://analytics.internal.company.com"
    api_key: "${BACKEND_API_KEY}"
    project_id: "prod-main"
    max_batch_size: 200

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [mybackend]
```

## Wrapping Up

The exporterhelper package does the heavy lifting for retry, queue, and timeout management. Your custom exporter only needs to focus on format conversion and network calls. This pattern lets you integrate any backend into the OpenTelemetry ecosystem, no matter how proprietary its API is.
