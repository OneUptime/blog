# How to Configure Jaeger Adaptive Sampling Based on Kubernetes Service Error Rates

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Kubernetes, Jaeger, Distributed Tracing, Sampling, Observability

Description: Learn how to configure Jaeger's adaptive sampling to automatically adjust trace sampling rates based on Kubernetes service error rates, ensuring you capture problematic traces while controlling data volume.

---

Fixed sampling rates create a dilemma in production systems. Sample too aggressively and you miss important error traces. Sample too conservatively and trace volume becomes overwhelming. Jaeger's adaptive sampling solves this by dynamically adjusting sampling rates based on observed service behavior, particularly error rates.

Adaptive sampling ensures that services experiencing errors are sampled more heavily, while well-behaved services are sampled less. This approach captures the traces you need for debugging while keeping overall data volume manageable in Kubernetes environments.

## Understanding Jaeger Adaptive Sampling

Jaeger adaptive sampling uses feedback from the Jaeger backend to adjust sampling probabilities. The sampling manager analyzes recent traces to determine appropriate sampling rates for each service and operation. Services with high error rates receive higher sampling probabilities, ensuring error cases are well represented in collected traces.

The system operates through periodic sampling strategy updates. Clients query the sampling manager for current strategies, apply them to new traces, and the cycle continues with the manager analyzing newly collected traces.

## Deploying Jaeger with Sampling Manager

Deploy Jaeger with the sampling manager component enabled:

```yaml
# jaeger-deployment.yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: jaeger-sampling-config
  namespace: observability
data:
  sampling.json: |
    {
      "default_strategy": {
        "type": "probabilistic",
        "param": 0.001
      },
      "service_strategies": [
        {
          "service": "payment-service",
          "type": "probabilistic",
          "param": 0.1
        }
      ],
      "per_operation_strategies": [
        {
          "service": "payment-service",
          "operation": "POST /charge",
          "probabilistic_sampling": {
            "sampling_rate": 0.5
          }
        }
      ]
    }
---
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
          - "--sampling.strategies-file=/etc/jaeger/sampling.json"
          - "--collector.num-workers=50"
          - "--collector.queue-size=2000"
        ports:
        - containerPort: 14250  # gRPC
        - containerPort: 14268  # HTTP
        - containerPort: 9411   # Zipkin
        volumeMounts:
        - name: sampling-config
          mountPath: /etc/jaeger
        env:
        - name: SPAN_STORAGE_TYPE
          value: "elasticsearch"
        - name: ES_SERVER_URLS
          value: "http://elasticsearch:9200"
      volumes:
      - name: sampling-config
        configMap:
          name: jaeger-sampling-config
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

Configure your applications to query the Jaeger sampling manager:

```go
// sampling.go
package main

import (
    "context"
    "fmt"
    "log"
    "os"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/jaeger"
    "go.opentelemetry.io/otel/sdk/resource"
    "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "github.com/jaegertracing/jaeger/pkg/sampling"
)

func initTracer() (*trace.TracerProvider, error) {
    // Create Jaeger exporter
    exporter, err := jaeger.New(
        jaeger.WithCollectorEndpoint(
            jaeger.WithEndpoint("http://jaeger-collector.observability.svc.cluster.local:14268/api/traces"),
        ),
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

    // Create remote sampler that queries Jaeger
    remoteSampler := NewJaegerRemoteSampler(
        "payment-service",
        "http://jaeger-collector.observability.svc.cluster.local:14268/api/sampling",
        60*time.Second,  // Refresh interval
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

// JaegerRemoteSampler implements remote sampling
type JaegerRemoteSampler struct {
    serviceName     string
    samplingURL     string
    refreshInterval time.Duration
    currentStrategy *sampling.Strategy
    closer          chan struct{}
}

func NewJaegerRemoteSampler(serviceName, samplingURL string, refreshInterval time.Duration) *JaegerRemoteSampler {
    sampler := &JaegerRemoteSampler{
        serviceName:     serviceName,
        samplingURL:     samplingURL,
        refreshInterval: refreshInterval,
        closer:          make(chan struct{}),
    }

    // Start background goroutine to refresh sampling strategy
    go sampler.refreshLoop()

    return sampler
}

func (s *JaegerRemoteSampler) refreshLoop() {
    ticker := time.NewTicker(s.refreshInterval)
    defer ticker.Stop()

    // Initial fetch
    s.updateStrategy()

    for {
        select {
        case <-ticker.C:
            s.updateStrategy()
        case <-s.closer:
            return
        }
    }
}

func (s *JaegerRemoteSampler) updateStrategy() {
    // Query Jaeger for sampling strategy
    url := fmt.Sprintf("%s?service=%s", s.samplingURL, s.serviceName)

    resp, err := http.Get(url)
    if err != nil {
        log.Printf("Failed to fetch sampling strategy: %v", err)
        return
    }
    defer resp.Body.Close()

    if resp.StatusCode != http.StatusOK {
        log.Printf("Sampling strategy request returned %d", resp.StatusCode)
        return
    }

    var strategyResponse sampling.SamplingStrategyResponse
    if err := json.NewDecoder(resp.Body).Decode(&strategyResponse); err != nil {
        log.Printf("Failed to decode sampling strategy: %v", err)
        return
    }

    s.currentStrategy = &strategyResponse.Strategy
    log.Printf("Updated sampling strategy: %+v", s.currentStrategy)
}

func (s *JaegerRemoteSampler) ShouldSample(p trace.SamplingParameters) trace.SamplingResult {
    if s.currentStrategy == nil {
        // Default to probabilistic sampling at 0.001 if no strategy loaded
        return trace.TraceIDRatioBased(0.001).ShouldSample(p)
    }

    // Apply strategy based on type
    switch s.currentStrategy.Type {
    case sampling.SamplingTypeConst:
        if s.currentStrategy.Param == 1.0 {
            return trace.SamplingResult{
                Decision:   trace.RecordAndSample,
                Tracestate: p.ParentContext.TraceState(),
            }
        }
        return trace.SamplingResult{
            Decision:   trace.Drop,
            Tracestate: p.ParentContext.TraceState(),
        }

    case sampling.SamplingTypeProbabilistic:
        return trace.TraceIDRatioBased(s.currentStrategy.Param).ShouldSample(p)

    case sampling.SamplingTypeRateLimiting:
        // Implement rate limiting sampler
        return s.rateLimitingSample(p)

    default:
        return trace.TraceIDRatioBased(0.001).ShouldSample(p)
    }
}

func (s *JaegerRemoteSampler) Description() string {
    return "JaegerRemoteSampler"
}
```

## Implementing Error-Based Adaptive Sampling

Create a custom sampling strategy that adjusts based on error rates:

```go
// adaptive_sampler.go
package sampling

import (
    "context"
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

    // Create tracer provider with adaptive sampler
    exporter, _ := jaeger.New(
        jaeger.WithCollectorEndpoint(
            jaeger.WithEndpoint("http://jaeger-collector.observability.svc.cluster.local:14268/api/traces"),
        ),
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

Create a monitoring dashboard to track sampling behavior:

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
                "expr": "jaeger_sampling_rate{service=\"payment-service\"}",
                "legendFormat": "{{service}}"
              }
            ]
          },
          {
            "title": "Error Rate by Service",
            "targets": [
              {
                "expr": "sum(rate(spans_total{status=\"error\"}[5m])) by (service) / sum(rate(spans_total[5m])) by (service)",
                "legendFormat": "{{service}}"
              }
            ]
          },
          {
            "title": "Traces Collected vs Dropped",
            "targets": [
              {
                "expr": "rate(traces_sampled_total[5m])",
                "legendFormat": "Sampled"
              },
              {
                "expr": "rate(traces_dropped_total[5m])",
                "legendFormat": "Dropped"
              }
            ]
          },
          {
            "title": "Error Trace Coverage",
            "targets": [
              {
                "expr": "sum(rate(spans_total{status=\"error\", sampled=\"true\"}[5m])) / sum(rate(spans_total{status=\"error\"}[5m]))",
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
package sampling_test

import (
    "context"
    "testing"
    "time"

    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/sdk/trace"
)

func TestAdaptiveSampler(t *testing.T) {
    sampler := NewAdaptiveSampler(0.01, 0.5, 1*time.Second)

    // Initially should sample at base rate
    sampledCount := 0
    for i := 0; i < 1000; i++ {
        result := sampler.ShouldSample(trace.SamplingParameters{})
        if result.Decision == trace.RecordAndSample {
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
        result := sampler.ShouldSample(trace.SamplingParameters{})
        if result.Decision == trace.RecordAndSample {
            sampledCount++
        }
    }

    t.Logf("After errors: %d/1000 (%.1f%%)", sampledCount, float64(sampledCount)/10.0)

    if sampledCount <= baselineSampleCount {
        t.Errorf("Expected sampling rate to increase after errors, but %d <= %d",
            sampledCount, baselineSampleCount)
    }
}
```

Adaptive sampling ensures you capture the traces that matter most while keeping data volume under control. By increasing sampling rates when services experience errors, you maintain visibility into problems without over-sampling during normal operations in your Kubernetes environment.
