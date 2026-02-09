# How to Fix the Go OpenTelemetry Exporter Failing Silently Because GOMEMLIMIT Is Not Set on the Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Collector, GOMEMLIMIT

Description: Fix silent exporter failures in Go applications caused by the OpenTelemetry Collector running without GOMEMLIMIT configured.

Your Go application is sending spans to the OpenTelemetry Collector, but some of them never arrive at your backend. The exporter does not report errors. The Collector logs look clean. But your traces are incomplete. The root cause might be that the Collector is running without `GOMEMLIMIT`, causing it to use excessive memory and silently drop data under pressure.

## Background on GOMEMLIMIT

Go 1.19 introduced the `GOMEMLIMIT` environment variable, which sets a soft memory limit for the Go runtime garbage collector. Without it, the Go GC uses a default target of keeping heap memory at 100% of the live heap size before triggering collection. This means the Collector can use much more memory than you expect before GC kicks in.

When the Collector runs in a container with a memory limit (say, 512MB), and `GOMEMLIMIT` is not set, the Go runtime might let memory grow to 400MB+ before GC runs. The container hits its memory limit and gets OOM-killed, or the Collector's internal buffers fill up and it starts dropping data silently.

## Symptoms

- Spans intermittently missing from your tracing backend
- The Go application's OTLP exporter does not log errors
- Collector pod restarts occasionally (check `kubectl get pods` for restart counts)
- Collector memory usage is spiky, approaching container limits

## The Fix: Set GOMEMLIMIT on the Collector

Set `GOMEMLIMIT` to about 80% of your container's memory limit. If your container has 512MB of memory:

```yaml
# Kubernetes deployment for the Collector
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.121.0
        env:
        - name: GOMEMLIMIT
          value: "410MiB"  # ~80% of 512MB
        resources:
          limits:
            memory: 512Mi
          requests:
            memory: 256Mi
```

For Docker Compose:

```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.121.0
    environment:
      - GOMEMLIMIT=410MiB
    deploy:
      resources:
        limits:
          memory: 512M
```

## Combine with memory_limiter Processor

`GOMEMLIMIT` controls Go's GC behavior, but you should also configure the `memory_limiter` processor in the Collector config to proactively refuse data before hitting the limit:

```yaml
# collector-config.yaml
processors:
  memory_limiter:
    # check_interval determines how often memory usage is checked
    check_interval: 1s
    # limit_percentage is the maximum percentage of total memory
    limit_percentage: 75
    # spike_limit_percentage accounts for sudden spikes
    spike_limit_percentage: 25

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

The `memory_limiter` processor should always be the first processor in the pipeline. It checks memory usage and starts refusing incoming data when usage exceeds the threshold. This gives the Collector time to export what it has in its buffers before accepting more.

## Understanding the Interaction

Here is how `GOMEMLIMIT` and `memory_limiter` work together:

1. `GOMEMLIMIT` (410MiB) tells Go's GC to be more aggressive when memory approaches this limit
2. `memory_limiter` (75% = 384MB) starts refusing new data before the GC limit is hit
3. Container memory limit (512MB) is the hard ceiling where OOM-kill happens

The layered approach ensures:
- Normal operation: memory stays well below limits
- Under load: `memory_limiter` throttles incoming data
- Extreme spikes: Go GC works harder due to `GOMEMLIMIT`
- Last resort: container OOM-kill (should rarely happen)

## Verifying From the Application Side

On your Go application side, check if the exporter is encountering transient failures by enabling debug logging:

```go
import "go.opentelemetry.io/otel"

// Set up an error handler to catch export errors
otel.SetErrorHandler(otel.ErrorHandlerFunc(func(err error) {
    log.Printf("OTel error: %v", err)
}))
```

Also, configure the OTLP exporter with retry:

```go
exporter, err := otlptracegrpc.New(ctx,
    otlptracegrpc.WithEndpoint("otel-collector:4317"),
    otlptracegrpc.WithRetry(otlptracegrpc.RetryConfig{
        Enabled:         true,
        InitialInterval: 1 * time.Second,
        MaxInterval:     10 * time.Second,
        MaxElapsedTime:  30 * time.Second,
    }),
)
```

When the Collector's `memory_limiter` is refusing data, the exporter will get back a gRPC status code indicating the Collector is temporarily unavailable. With retry enabled, the exporter will attempt to resend the data after the Collector recovers.

## Quick Diagnostic Checklist

1. Check Collector memory usage: `kubectl top pods` or your monitoring dashboard
2. Check Collector restart count: `kubectl get pods` (look at RESTARTS column)
3. Check if GOMEMLIMIT is set: `kubectl exec <pod> -- env | grep GOMEMLIMIT`
4. Check Collector logs for memory_limiter messages: they will log when data is being refused

Setting `GOMEMLIMIT` is a simple change that prevents a wide class of silent data loss issues. It should be part of every Collector deployment.
