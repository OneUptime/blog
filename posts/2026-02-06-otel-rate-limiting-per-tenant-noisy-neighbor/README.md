# How to Implement Collector-Level Rate Limiting Per Tenant to Prevent Noisy Neighbor Problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Rate Limiting, Multi-Tenant, Noisy Neighbor, Collector

Description: Implement per-tenant rate limiting in the OpenTelemetry Collector to prevent noisy neighbor problems and ensure fair telemetry resource usage.

In multi-tenant observability setups, one team deploying a buggy service can flood the collector with millions of spans per minute. Without rate limiting, this noisy neighbor eats all the collector's memory, fills the export queue, and degrades observability for every other team. Per-tenant rate limiting at the collector level prevents this.

## The Noisy Neighbor Problem

Here is a typical scenario. Team A has 50 services producing a steady 10,000 spans per second. Team B deploys a new version with an infinite retry loop that suddenly generates 500,000 spans per second. Without rate limiting, the collector tries to process everything, its memory spikes, it starts dropping data from all teams, and everyone loses visibility at the worst possible moment.

## Using the Rate Limiting Processor

The OpenTelemetry Collector contrib distribution includes a rate limiting processor that you can configure per pipeline. Combined with routing, you get per-tenant limits:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  routing/by_tenant:
    table:
      - statement: route() where resource.attributes["tenant.id"] == "team-a"
        pipelines: [traces/team_a]
      - statement: route() where resource.attributes["tenant.id"] == "team-b"
        pipelines: [traces/team_b]
      - statement: route() where resource.attributes["tenant.id"] == "team-c"
        pipelines: [traces/team_c]
    default_pipelines: [traces/default]

processors:
  # Each tenant gets their own rate limit
  rate_limiter/team_a:
    # Allow 20,000 spans per second for team A
    rate: 20000
    burst: 25000

  rate_limiter/team_b:
    # Allow 10,000 spans per second for team B
    rate: 10000
    burst: 15000

  rate_limiter/team_c:
    # Allow 5,000 spans per second for team C
    rate: 5000
    burst: 8000

  rate_limiter/default:
    # Default limit for unidentified tenants
    rate: 1000
    burst: 2000

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: []
      exporters: [routing/by_tenant]

    traces/team_a:
      receivers: [routing/by_tenant]
      processors: [rate_limiter/team_a, batch]
      exporters: [otlp]

    traces/team_b:
      receivers: [routing/by_tenant]
      processors: [rate_limiter/team_b, batch]
      exporters: [otlp]

    traces/team_c:
      receivers: [routing/by_tenant]
      processors: [rate_limiter/team_c, batch]
      exporters: [otlp]

    traces/default:
      receivers: [routing/by_tenant]
      processors: [rate_limiter/default, batch]
      exporters: [otlp]
```

## Alternative: Using the Probabilistic Sampler for Soft Limits

If you prefer soft limits (reduce volume but do not hard-drop), use the probabilistic sampler with different rates per tenant:

```yaml
processors:
  # Team A is a large tenant, sample 50% of their traces
  probabilistic_sampler/team_a:
    sampling_percentage: 50
    hash_seed: 42

  # Team B is smaller, keep 100%
  probabilistic_sampler/team_b:
    sampling_percentage: 100
    hash_seed: 42

  # Team C generates lots of noise, sample 10%
  probabilistic_sampler/team_c:
    sampling_percentage: 10
    hash_seed: 42
```

This approach is less precise than hard rate limiting but has the advantage of maintaining trace completeness for the traces that are kept.

## Memory Protection with Per-Pipeline Memory Limiters

Rate limiting controls ingest, but you also need memory protection. Configure memory limiters per pipeline:

```yaml
processors:
  memory_limiter/team_a:
    check_interval: 1s
    limit_mib: 256
    spike_limit_mib: 64

  memory_limiter/team_b:
    check_interval: 1s
    limit_mib: 128
    spike_limit_mib: 32

  memory_limiter/default:
    check_interval: 1s
    limit_mib: 64
    spike_limit_mib: 16

service:
  pipelines:
    traces/team_a:
      receivers: [routing/by_tenant]
      processors: [memory_limiter/team_a, rate_limiter/team_a, batch]
      exporters: [otlp]
```

## Tracking Rate-Limited Data

You need to know when data is being dropped. Add attributes before rate limiting so you can track it:

```yaml
processors:
  transform/tag_tenant:
    trace_statements:
      - context: resource
        statements:
          - set(attributes["rate_limit.applied"], true)

  # Then use the collector's internal metrics
```

Monitor these collector metrics to know when rate limiting kicks in:

```bash
# Check the processor's dropped span count
curl -s http://localhost:8888/metrics | \
  grep "otelcol_processor_dropped_spans"

# Output will show per-processor metrics:
# otelcol_processor_dropped_spans{processor="rate_limiter/team_a"} 0
# otelcol_processor_dropped_spans{processor="rate_limiter/team_c"} 45231
```

## Setting Limits Based on Real Usage

Do not guess at rate limits. Measure first:

```bash
# Query your backend for per-tenant span rates over the last week
# Then set limits at 2x the P95 to allow for normal spikes

# Example: if team_a normally sends 8,000-12,000 spans/sec
# with occasional spikes to 18,000, set the limit at ~25,000
# and the burst at ~30,000
```

A good rule of thumb: set the steady-state limit at 2x the team's normal peak, and the burst at 2.5x. This handles legitimate traffic spikes while still protecting against runaway services.

## Communicating Limits to Tenants

Rate limiting only works if teams know about it. Publish your limits and provide dashboards:

```yaml
# Include rate limit info as resource attributes so teams can see them
processors:
  transform/limit_info:
    trace_statements:
      - context: resource
        statements:
          - set(attributes["rate_limit.max_spans_per_sec"], 20000)
            where attributes["tenant.id"] == "team-a"
          - set(attributes["rate_limit.max_spans_per_sec"], 10000)
            where attributes["tenant.id"] == "team-b"
```

## Wrapping Up

Per-tenant rate limiting is essential for any shared observability infrastructure. Without it, one noisy team can take down observability for everyone. The combination of routing connectors, rate limiting processors, and memory limiters gives you a robust defense. Start with generous limits based on actual usage data, monitor dropped spans closely, and communicate limits clearly to your tenants.
