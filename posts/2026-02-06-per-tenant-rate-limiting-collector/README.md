# How to Implement Per-Tenant Rate Limiting in the Collector to Prevent Noisy Neighbor Telemetry Storms

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Rate Limiting, Multi-Tenant, Noisy Neighbor

Description: Implement per-tenant rate limiting in the OpenTelemetry Collector to prevent one team from overwhelming shared observability infrastructure.

The noisy neighbor problem is one of the biggest operational risks in multi-tenant observability. A single team deploys a buggy service that generates 10x normal telemetry volume, and suddenly the shared Collector gateway is overwhelmed, dropping data for everyone. Per-tenant rate limiting prevents this by capping each tenant's throughput independently.

## The Noisy Neighbor Problem

Without rate limiting, here is what happens:

1. Team A deploys a service with an accidental logging loop.
2. Their telemetry volume jumps from 1,000 to 1,000,000 spans per second.
3. The shared gateway Collector hits its memory limit.
4. The Collector starts dropping data from all teams, not just Team A.
5. Teams B, C, and D lose visibility during an unrelated incident.

## Rate Limiting with the Collector's Transform Processor

The OpenTelemetry Collector does not have a built-in per-tenant rate limiter, but you can build one using a combination of the routing processor and multiple pipeline configurations:

```yaml
# gateway-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 16

processors:
  batch:
    send_batch_size: 8192
    timeout: 2s

  memory_limiter:
    check_interval: 1s
    limit_mib: 8192
    spike_limit_mib: 2048

  # Route traces to team-specific pipelines
  routing/traces:
    from_attribute: team.name
    attribute_source: resource
    table:
      - value: payments
        pipelines: [traces/payments]
      - value: catalog
        pipelines: [traces/catalog]
      - value: frontend
        pipelines: [traces/frontend]
    default_pipelines: [traces/default]

  # Per-team rate limiting via probabilistic sampling
  # When a team exceeds their budget, increase sampling
  probabilistic_sampler/payments:
    sampling_percentage: 100  # Critical: keep everything

  probabilistic_sampler/catalog:
    sampling_percentage: 25   # High volume, sample aggressively

  probabilistic_sampler/frontend:
    sampling_percentage: 50

  probabilistic_sampler/default:
    sampling_percentage: 10   # Unknown teams get minimal sampling

exporters:
  otlphttp:
    endpoint: https://backend:4318

service:
  pipelines:
    traces/intake:
      receivers: [otlp]
      processors: [memory_limiter, routing/traces]
      exporters: []

    traces/payments:
      receivers: [routing/traces]
      processors: [probabilistic_sampler/payments, batch]
      exporters: [otlphttp]

    traces/catalog:
      receivers: [routing/traces]
      processors: [probabilistic_sampler/catalog, batch]
      exporters: [otlphttp]

    traces/frontend:
      receivers: [routing/traces]
      processors: [probabilistic_sampler/frontend, batch]
      exporters: [otlphttp]

    traces/default:
      receivers: [routing/traces]
      processors: [probabilistic_sampler/default, batch]
      exporters: [otlphttp]
```

## Custom Rate Limiter Processor

For true per-tenant rate limiting (not just sampling), build a custom processor or use a proxy:

```go
// rate_limiter.go
package ratelimiter

import (
    "context"
    "sync"
    "time"

    "go.opentelemetry.io/collector/pdata/ptrace"
    "golang.org/x/time/rate"
)

type TenantRateLimiter struct {
    limiters map[string]*rate.Limiter
    mu       sync.RWMutex
    config   map[string]RateConfig
    defaults RateConfig
}

type RateConfig struct {
    SpansPerSecond int
    BurstSize      int
}

func NewTenantRateLimiter(config map[string]RateConfig) *TenantRateLimiter {
    return &TenantRateLimiter{
        limiters: make(map[string]*rate.Limiter),
        config:   config,
        defaults: RateConfig{SpansPerSecond: 1000, BurstSize: 5000},
    }
}

func (trl *TenantRateLimiter) getLimiter(tenant string) *rate.Limiter {
    trl.mu.RLock()
    limiter, exists := trl.limiters[tenant]
    trl.mu.RUnlock()

    if exists {
        return limiter
    }

    // Create a new limiter for this tenant
    trl.mu.Lock()
    defer trl.mu.Unlock()

    // Double-check after acquiring write lock
    if limiter, exists = trl.limiters[tenant]; exists {
        return limiter
    }

    cfg, ok := trl.config[tenant]
    if !ok {
        cfg = trl.defaults
    }

    limiter = rate.NewLimiter(
        rate.Limit(cfg.SpansPerSecond),
        cfg.BurstSize,
    )
    trl.limiters[tenant] = limiter
    return limiter
}

func (trl *TenantRateLimiter) ProcessTraces(
    ctx context.Context, td ptrace.Traces,
) (ptrace.Traces, error) {
    // Extract tenant from resource attributes
    resourceSpans := td.ResourceSpans()
    for i := 0; i < resourceSpans.Len(); i++ {
        rs := resourceSpans.At(i)
        tenant, found := rs.Resource().Attributes().Get("team.name")
        if !found {
            continue
        }

        tenantName := tenant.Str()
        limiter := trl.getLimiter(tenantName)

        // Count spans in this resource
        spanCount := 0
        for j := 0; j < rs.ScopeSpans().Len(); j++ {
            spanCount += rs.ScopeSpans().At(j).Spans().Len()
        }

        // Check rate limit
        if !limiter.AllowN(time.Now(), spanCount) {
            // Rate limited: drop spans from this tenant
            // In production, you would sample rather than drop
            rs.ScopeSpans().RemoveIf(func(ss ptrace.ScopeSpans) bool {
                return true // Remove all spans for this batch
            })
        }
    }

    return td, nil
}
```

## Configuration for the Custom Processor

```yaml
# Rate limits per tenant
rate_limiter:
  tenants:
    payments:
      spans_per_second: 50000
      burst_size: 100000
    catalog:
      spans_per_second: 10000
      burst_size: 20000
    frontend:
      spans_per_second: 25000
      burst_size: 50000
  defaults:
    spans_per_second: 5000
    burst_size: 10000
```

## Monitoring Rate Limiting

Track when tenants are being rate limited so they can adjust:

```yaml
# Add to the gateway Collector's telemetry config
service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888
```

Create alerts for rate limiting events:

```yaml
# Prometheus alert rule
groups:
  - name: rate-limiting
    rules:
      - alert: TenantRateLimited
        expr: |
          rate(otel_processor_rate_limiter_dropped_spans_total[5m]) > 0
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: "Tenant {{ $labels.tenant }} is being rate limited"
          description: "{{ $labels.tenant }} is exceeding their span rate limit"
```

## Wrapping Up

Per-tenant rate limiting is essential for multi-tenant observability. Without it, one team's runaway telemetry can take down the entire observability pipeline. Whether you use sampling-based limits in the Collector's routing processor or build a custom rate limiter, the key is to isolate tenants from each other's resource consumption.
