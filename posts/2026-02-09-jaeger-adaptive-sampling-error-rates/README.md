# How to Configure Jaeger Adaptive Sampling Based

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jaeger, Distributed Tracing, Sampling, Observability

Description: Learn how to configure Jaeger's adaptive sampling to automatically adjust trace sampling rates based on Kubernetes service error rates.

---

Fixed sampling rates create a dilemma in production systems. Sample too aggressively and you miss important error traces. Sample too conservatively and trace volume becomes overwhelming. Jaeger's adaptive sampling solves part of this by dynamically adjusting sampling rates based on observed traffic volume for each service and operation.

Adaptive sampling keeps a target number of traces per service and operation, while a custom application sampler can increase sampling when sampled spans show errors. This approach captures more traces during problematic windows while keeping overall data volume manageable in Kubernetes environments.

## Understanding Jaeger Adaptive Sampling

Jaeger adaptive sampling uses feedback from the Jaeger backend to adjust sampling probabilities. The Jaeger collector observes recent spans and recalculates sampling probabilities for each service and operation so collected traces match a configured target rate. It is traffic-volume based, not error-rate based, so error-aware sampling has to be implemented in the application or in another sampling layer.

The system operates through periodic sampling strategy updates. Clients query the collector for current strategies, apply them to new traces, and the cycle continues with the collector analyzing newly collected traces.

## Deploying Jaeger with Adaptive Sampling

Deploy Jaeger collector with adaptive sampling enabled:

```yaml
# jaeger-deployment.yaml

apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger-collector
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: jaeger-collector
  template:
    metadata:
      labels:
        app: jaeger-collector
    spec:
      containers:
      - name: jaeger-collector
        image: jaegertracing/jaeger-collector:1.52
        args:
          - "--sampling.target-samples-per-second=1"
          - "--sampling.initial-sampling-probability=0.001"
          - "--collector.num-workers=50"
          - "--collector.queue-size=2000"
        ports:
        - containerPort: 4318   # OTLP HTTP
        - containerPort: 14250  # gRPC
        - containerPort: 14268  # HTTP
        - containerPort: 9411   # Zipkin
        env:
        - name: SAMPLING_CONFIG_TYPE
          value: "adaptive"
        - name: SPAN_STORAGE_TYPE
          value: "elasticsearch"
        - name: ES_SERVER_URLS
          value: "http://elasticsearch:9200"
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger-query
  namespace: observability
spec:
  replicas: 2
  selector:
    matchLabels:
      app: jaeger-query
  template:
    metadata:
      labels:
        app: jaeger-query
    spec:
      containers:
      - name: jaeger-query
        image: jaegertracing/jaeger-query:1.52
        args:
          - "--query.base-path=/jaeger"
        ports:
        - containerPort: 16686
        - containerPort: 16687  # Admin port
        env:
        - name: SPAN_STORAGE_TYPE
          value: "elasticsearch"
        - name: ES_SERVER_URLS
          value: "http://elasticsearch:9200"
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-collector
  namespace: observability
spec:
  selector:
    app: jaeger-collector
  ports:
  - name: otlp-http
    port: 4318
    targetPort: 4318
  - name: grpc
    port: 14250
    targetPort: 14250
  - name: http
    port: 14268
    targetPort: 14268
  - name: zipkin
    port: 9411
    targetPort: 9411
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger-query
  namespace: observability
spec:
  selector:
    app: jaeger-query
  ports:
  - name: query
    port: 16686
    targetPort: 16686
```

## Configuring Application for Remote Sampling

Configure your applications to query the Jaeger collector for remote sampling strategies:

```go
// sampling.go
package main

import (
    "context"
    "os"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/contrib/samplers/jaegerremote"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
    "go.opentelemetry.io/otel/sdk/resource"
    "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func initTracer() (*trace.TracerProvider, error) {
    // Create OTLP exporter for Jaeger 1.35+.
    exporter, err := otlptracehttp.New(context.Background(),
        otlptracehttp.WithEndpoint("jaeger-collector.observability.svc.cluster.local:4318"),
        otlptracehttp.WithInsecure(),
    )
    if err != nil {
        return nil, err
    }

    // Create resource
    res, err := resource.New(context.Background(),
        resource.WithAttributes(
            semconv.ServiceName("payment-service"),
            semconv.ServiceNamespace(os.Getenv("K8S_NAMESPACE")),
            semconv.ServiceInstanceID(os.Getenv("K8S_POD_NAME")),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Create remote sampler that queries the Jaeger collector.
    remoteSampler := jaegerremote.New(
        "payment-service",
        jaegerremote.WithSamplingServerURL("http://jaeger-collector.observability.svc.cluster.local:14268/api/sampling"),
        jaegerremote.WithSamplingRefreshInterval(60*time.Second),
        jaegerremote.WithInitialSampler(trace.TraceIDRatioBased(0.001)),
    )

    // Create tracer provider with remote sampler
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithResource(res),
        trace.WithSampler(remoteSampler),
    )

    otel.SetTracerProvider(tp)
    return tp, nil
}
```

## Implementing Error-Based Adaptive Sampling

Create a custom sampling strategy that adjusts based on errors observed in sampled spans from the previous window. Because this is head-based sampling, the sampler cannot know that a trace will contain an error before it makes the initial sampling decision.

```go
// adaptive_sampler.go
package sampling

import (
    "context"
    "log"
    "sync"
    "time"

    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/sdk/trace"
)

// AdaptiveSampler adjusts sampling rate based on error rates
type AdaptiveSampler struct {
    mu                  sync.RWMutex
    baseRate            float64
    errorRate           float64
    errorBoost          float64
    windowSize          time.Duration
    errorCount          int64
    totalCount          int64
    currentSamplingRate float64
    lastUpdate          time.Time
}

func NewAdaptiveSampler(baseRate, errorBoost float64, windowSize time.Duration) *AdaptiveSampler {
    sampler := &AdaptiveSampler{
        baseRate:            baseRate,
        errorBoost:          errorBoost,
        windowSize:          windowSize,
        currentSamplingRate: baseRate,
        lastUpdate:          time.Now(),
    }

    // Start background goroutine to recalculate sampling rate
    go sampler.updateLoop()

    return sampler
}

func (s *AdaptiveSampler) ShouldSample(p trace.SamplingParameters) trace.SamplingResult {
    s.mu.RLock()
    rate := s.currentSamplingRate
    s.mu.RUnlock()

    // Use trace ID ratio-based sampling with current rate
    sampler := trace.TraceIDRatioBased(rate)
    result := sampler.ShouldSample(p)

    // Track span for error rate calculation
    if result.Decision == trace.RecordAndSample {
        go s.trackSpan(p)
    }

    return result
}

func (s *AdaptiveSampler) trackSpan(p trace.SamplingParameters) {
    s.mu.Lock()
    s.totalCount++
    s.mu.Unlock()
}

func (s *AdaptiveSampler) RecordError() {
    s.mu.Lock()
    s.errorCount++
    s.mu.Unlock()
}

func (s *AdaptiveSampler) updateLoop() {
    ticker := time.NewTicker(s.windowSize)
    defer ticker.Stop()

    for range ticker.C {
        s.recalculateRate()
    }
}

func (s *AdaptiveSampler) recalculateRate() {
    s.mu.Lock()
    defer s.mu.Unlock()

    // Calculate error rate
    if s.totalCount > 0 {
        s.errorRate = float64(s.errorCount) / float64(s.totalCount)
    } else {
        s.errorRate = 0
    }

    // Adjust sampling rate based on error rate
    // Higher error rate = higher sampling
    adjustment := s.errorRate * s.errorBoost
    newRate := s.baseRate + adjustment

    // Cap at 1.0 (100% sampling)
    if newRate > 1.0 {
        newRate = 1.0
    }

    s.currentSamplingRate = newRate

    log.Printf("Adaptive sampling: error_rate=%.4f, sampling_rate=%.4f, errors=%d, total=%d",
        s.errorRate, s.currentSamplingRate, s.errorCount, s.totalCount)

    // Reset counters for next window
    s.errorCount = 0
    s.totalCount = 0
    s.lastUpdate = time.Now()
}

func (s *AdaptiveSampler) Description() string {
    return "AdaptiveSampler"
}

// SpanProcessor to feed error information to sampler
type ErrorTrackingProcessor struct {
    sampler *AdaptiveSampler
}

func NewErrorTrackingProcessor(sampler *AdaptiveSampler) *ErrorTrackingProcessor {
    return &ErrorTrackingProcessor{sampler: sampler}
}

func (p *ErrorTrackingProcessor) OnStart(parent context.Context, s trace.ReadWriteSpan) {
    // No-op
}

func (p *ErrorTrackingProcessor) OnEnd(s trace.ReadOnlySpan) {
    // Check if span has error status
    if s.Status().Code == codes.Error {
        p.sampler.RecordError()
    }
}

func (p *ErrorTrackingProcessor) Shutdown(ctx context.Context) error {
    return nil
}

func (p *ErrorTrackingProcessor) ForceFlush(ctx context.Context) error {
    return nil
}
```

Use the adaptive sampler in your application:

```go
// main.go
func main() {
    // Create adaptive sampler
    // Base rate: 0.001 (0.1%), Error boost: 0.5 (increases up to 50% on errors)
    adaptiveSampler := sampling.NewAdaptiveSampler(0.001, 0.5, 60*time.Second)

    // Create OTLP exporter for Jaeger 1.35+.
    exporter, _ := otlptracehttp.New(context.Background(),
        otlptracehttp.WithEndpoint("jaeger-collector.observability.svc.cluster.local:4318"),
        otlptracehttp.WithInsecure(),
    )

    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
        trace.WithSampler(adaptiveSampler),
        trace.WithSpanProcessor(sampling.NewErrorTrackingProcessor(adaptiveSampler)),
    )

    otel.SetTracerProvider(tp)
    defer tp.Shutdown(context.Background())

    // Start application
    startServer()
}
```

## Monitoring Sampling Effectiveness

If your application exports sampler metrics, create a monitoring dashboard to track sampling behavior:

```yaml
# sampling-dashboard.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: sampling-dashboard
  namespace: observability
data:
  dashboard.json: |
    {
      "dashboard": {
        "title": "Adaptive Sampling Metrics",
        "panels": [
          {
            "title": "Sampling Rate by Service",
            "targets": [
              {
                "expr": "adaptive_sampler_sampling_rate{service=\"payment-service\"}",
                "legendFormat": "{{service}}"
              }
            ]
          },
          {
            "title": "Error Rate by Service",
            "targets": [
              {
                "expr": "sum(rate(adaptive_sampler_errors_total[5m])) by (service) / sum(rate(adaptive_sampler_sampled_spans_total[5m])) by (service)",
                "legendFormat": "{{service}}"
              }
            ]
          },
          {
            "title": "Traces Collected vs Dropped",
            "targets": [
              {
                "expr": "rate(adaptive_sampler_sampled_traces_total[5m])",
                "legendFormat": "Sampled"
              },
              {
                "expr": "rate(adaptive_sampler_dropped_traces_total[5m])",
                "legendFormat": "Dropped"
              }
            ]
          },
          {
            "title": "Error Trace Coverage",
            "targets": [
              {
                "expr": "sum(rate(adaptive_sampler_errors_total[5m])) / sum(rate(application_errors_total[5m]))",
                "legendFormat": "Error Trace Coverage %"
              }
            ]
          }
        ]
      }
    }
```

## Testing Adaptive Sampling Behavior

Create tests to verify sampling adapts to error conditions:

```go
// adaptive_sampler_test.go
package sampling

import (
    "encoding/binary"
    "testing"
    "time"

    oteltrace "go.opentelemetry.io/otel/trace"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

func TestAdaptiveSampler(t *testing.T) {
    sampler := NewAdaptiveSampler(0.01, 0.5, 1*time.Second)

    // Initially should sample at base rate
    sampledCount := 0
    for i := 0; i < 1000; i++ {
        result := sampler.ShouldSample(samplingParams(i))
        if result.Decision == sdktrace.RecordAndSample {
            sampledCount++
        }
    }

    baselineSampleCount := sampledCount
    t.Logf("Baseline sampling: %d/1000 (%.1f%%)", sampledCount, float64(sampledCount)/10.0)

    // Simulate high error rate
    for i := 0; i < 500; i++ {
        sampler.RecordError()
    }

    // Wait for sampling rate to adjust
    time.Sleep(1500 * time.Millisecond)

    // Should now sample at higher rate
    sampledCount = 0
    for i := 0; i < 1000; i++ {
        result := sampler.ShouldSample(samplingParams(i + 1000))
        if result.Decision == sdktrace.RecordAndSample {
            sampledCount++
        }
    }

    t.Logf("After errors: %d/1000 (%.1f%%)", sampledCount, float64(sampledCount)/10.0)

    if sampledCount <= baselineSampleCount {
        t.Errorf("Expected sampling rate to increase after errors, but %d <= %d",
            sampledCount, baselineSampleCount)
    }
}

func samplingParams(i int) sdktrace.SamplingParameters {
    var traceID oteltrace.TraceID
    binary.BigEndian.PutUint64(traceID[8:], uint64(i+1))
    return sdktrace.SamplingParameters{TraceID: traceID}
}
```

Adaptive sampling helps keep trace volume under control by targeting a stable sample rate per service and operation. By adding application-side error-aware sampling, you can raise sampling rates after sampled errors appear while avoiding over-sampling during normal operation in your Kubernetes environment.
