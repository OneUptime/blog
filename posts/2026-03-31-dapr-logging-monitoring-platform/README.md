# How to Build a Logging and Monitoring Platform with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Logging, Observability, OpenTelemetry

Description: Learn how to build a centralized logging and monitoring platform using Dapr pub/sub for log aggregation, bindings for storage, and OpenTelemetry tracing.

---

## Overview

A centralized logging and monitoring platform collects structured logs, metrics, and traces from all microservices. Dapr pub/sub aggregates telemetry from distributed services, output bindings route data to Elasticsearch or Loki, and built-in OpenTelemetry support provides distributed tracing.

## Architecture

```text
Services --> Dapr Pub/Sub (logs/metrics topics) --> Log Aggregator Service
         --> Dapr Sidecar (auto traces) --> OpenTelemetry Collector --> Jaeger/Tempo
```

## Structured Log Model

```go
package main

type LogLevel string

const (
    LevelDebug LogLevel = "DEBUG"
    LevelInfo  LogLevel = "INFO"
    LevelWarn  LogLevel = "WARN"
    LevelError LogLevel = "ERROR"
)

type LogEntry struct {
    Timestamp  int64             `json:"timestamp"`
    Level      LogLevel          `json:"level"`
    Service    string            `json:"service"`
    TraceID    string            `json:"traceId"`
    SpanID     string            `json:"spanId"`
    Message    string            `json:"message"`
    Fields     map[string]any    `json:"fields"`
    Error      string            `json:"error,omitempty"`
}

type Metric struct {
    Timestamp  int64             `json:"timestamp"`
    Name       string            `json:"name"`
    Value      float64           `json:"value"`
    Labels     map[string]string `json:"labels"`
    Type       string            `json:"type"` // "counter", "gauge", "histogram"
}
```

## Log Publisher (in application services)

```go
type DaprLogger struct {
    daprClient dapr.Client
    service    string
}

func (l *DaprLogger) Log(level LogLevel, message string, fields map[string]any) {
    entry := LogEntry{
        Timestamp: time.Now().UnixMilli(),
        Level:     level,
        Service:   l.service,
        Message:   message,
        Fields:    fields,
    }

    l.daprClient.PublishEvent(
        context.Background(),
        "logging-pubsub",
        "application-logs",
        entry,
    )
}

func (l *DaprLogger) Error(message string, err error, fields map[string]any) {
    if fields == nil {
        fields = make(map[string]any)
    }
    fields["errorType"] = fmt.Sprintf("%T", err)
    entry := LogEntry{
        Timestamp: time.Now().UnixMilli(),
        Level:     LevelError,
        Service:   l.service,
        Message:   message,
        Error:     err.Error(),
        Fields:    fields,
    }
    l.daprClient.PublishEvent(context.Background(), "logging-pubsub", "application-logs", entry)
}
```

## Log Aggregator Service

```go
type LogAggregator struct {
    daprClient dapr.Client
    buffer     []LogEntry
    mu         sync.Mutex
    flushEvery time.Duration
}

func (la *LogAggregator) HandleLog(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var entry LogEntry
    if err := json.Unmarshal(e.RawData, &entry); err != nil {
        return false, err
    }

    la.mu.Lock()
    la.buffer = append(la.buffer, entry)
    shouldFlush := len(la.buffer) >= 100
    la.mu.Unlock()

    if shouldFlush {
        la.flush(ctx)
    }

    return false, nil
}

func (la *LogAggregator) flush(ctx context.Context) {
    la.mu.Lock()
    batch := la.buffer
    la.buffer = nil
    la.mu.Unlock()

    if len(batch) == 0 {
        return
    }

    // Send to Elasticsearch via HTTP binding
    bulkBody := buildElasticsearchBulk(batch)
    la.daprClient.InvokeBinding(ctx, &dapr.InvokeBindingRequest{
        Name:      "elasticsearch",
        Operation: "post",
        Data:      []byte(bulkBody),
    })
}
```

## Metrics Collection

```go
func handleMetric(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var metric Metric
    json.Unmarshal(e.RawData, &metric)

    // Store time-series metric
    key := fmt.Sprintf("metric:%s:%d", metric.Name, time.Now().Truncate(time.Minute).Unix())
    existing, _ := daprClient.GetState(ctx, "metrics-store", key, nil)

    var values []float64
    if existing.Value != nil {
        json.Unmarshal(existing.Value, &values)
    }
    values = append(values, metric.Value)

    data, _ := json.Marshal(values)
    return false, daprClient.SaveState(ctx, "metrics-store", key, data, nil)
}
```

## OpenTelemetry Configuration

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: monitoring-config
spec:
  tracing:
    samplingRate: "1"
    otel:
      endpointAddress: "otel-collector.monitoring:4317"
      isSecure: false
      protocol: "grpc"
```

## Alert Rule Evaluation

```go
func evaluateAlerts(ctx context.Context) {
    rules := loadAlertRules()

    for _, rule := range rules {
        value := queryMetric(ctx, rule.MetricName, rule.Window)
        if rule.Condition(value) {
            daprClient.PublishEvent(ctx, "logging-pubsub", "alert-triggered", map[string]any{
                "rule":      rule.Name,
                "metric":    rule.MetricName,
                "value":     value,
                "threshold": rule.Threshold,
                "severity":  rule.Severity,
            })
        }
    }
}
```

## Summary

Dapr pub/sub enables centralized log aggregation without direct dependencies between services and logging infrastructure. Structured log entries flow through pub/sub topics to the aggregator service, which batches them into Elasticsearch via output bindings. Dapr's built-in OpenTelemetry support provides distributed tracing across all services automatically, completing a full observability platform with logs, metrics, and traces.
