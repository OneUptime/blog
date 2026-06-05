# Use Collector-Level Rate Limiting Per Tenant to Prevent Noisy Neighbor Problems

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Rate Limiting, Multi-Tenant, Noisy Neighbor, Collector

Description: Implement per-tenant rate limiting in the OpenTelemetry Collector to prevent noisy neighbor problems and ensure fair telemetry resource usage.

In multi-tenant observability setups, one team deploying a buggy service can flood the collector with millions of spans per minute. Without rate limiting, this noisy neighbor eats all the collector's memory, fills the export queue, and degrades observability for every other team. Per-tenant rate limiting at the collector level prevents this.

## The Noisy Neighbor Problem

Here is a typical scenario. Team A has 50 services producing a steady 10,000 spans per second. Team B deploys a new version with an infinite retry loop that suddenly generates 500,000 spans per second. Without rate limiting, the collector tries to process everything, its memory spikes, it starts dropping data from all teams, and everyone loses visibility at the worst possible moment.

## Using Tail Sampling Rate Limits

The OpenTelemetry Collector contrib distribution includes the tail sampling processor, which has a `rate_limiting` policy for traces. Combined with routing, you get per-tenant limits:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  routing/by_tenant:
    error_mode: ignore
    table:
      - condition: attributes["tenant.id"] == "team-a"
        pipelines: [traces/team_a]
      - condition: attributes["tenant.id"] == "team-b"
        pipelines: [traces/team_b]
      - condition: attributes["tenant.id"] == "team-c"
        pipelines: [traces/team_c]
    default_pipelines: [traces/default]

processors:
  # Each tenant gets their own trace sampler with a span-rate limit
  tail_sampling/team_a:
    decision_wait: 10s
    policies:
      - name: team-a-rate-limit
        type: rate_limiting
        rate_limiting:
          # Allow 20,000 spans per second for team A
          spans_per_second: 20000
          burst_capacity: 25000

  tail_sampling/team_b:
    decision_wait: 10s
    policies:
      - name: team-b-rate-limit
        type: rate_limiting
        rate_limiting:
          # Allow 10,000 spans per second for team B
          spans_per_second: 10000
          burst_capacity: 15000

  tail_sampling/team_c:
    decision_wait: 10s
    policies:
      - name: team-c-rate-limit
        type: rate_limiting
        rate_limiting:
          # Allow 5,000 spans per second for team C
          spans_per_second: 5000
          burst_capacity: 8000

  tail_sampling/default:
    decision_wait: 10s
    policies:
      - name: default-rate-limit
        type: rate_limiting
        rate_limiting:
          # Default limit for unidentified tenants
          spans_per_second: 1000
          burst_capacity: 2000

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
      processors: [tail_sampling/team_a, batch]
      exporters: [otlp]

    traces/team_b:
      receivers: [routing/by_tenant]
      processors: [tail_sampling/team_b, batch]
      exporters: [otlp]

    traces/team_c:
      receivers: [routing/by_tenant]
      processors: [tail_sampling/team_c, batch]
      exporters: [otlp]

    traces/default:
      receivers: [routing/by_tenant]
      processors: [tail_sampling/default, batch]
      exporters: [otlp]
```

## Alternative: Using the Probabilistic Sampler for Soft Limits

If you prefer soft limits that reduce volume by percentage instead of enforcing a span-per-second cap, use the probabilistic sampler with different rates per tenant:

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

This approach is less precise than span-per-second limiting but can keep complete traces when all spans for a trace use the same TraceID-based sampling decision.

## Memory Protection with Per-Pipeline Memory Limiters

Tail-sampling limits control export volume, but you also need memory protection. Configure memory limiters in each routed pipeline:

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
      processors: [memory_limiter/team_a, tail_sampling/team_a, batch]
      exporters: [otlp]
```

## Tracking Rate-Limited Data

You need to know when data is being limited. Add attributes before tail sampling so sampled traces carry the policy name, then use the Collector's internal metrics to count sampling decisions:

```yaml
processors:
  transform/tag_tenant:
    trace_statements:
      - context: resource
        statements:
          - set(attributes["rate_limit.policy"], "team-a-rate-limit")
            where attributes["tenant.id"] == "team-a"

  # Then use the collector's internal metrics
```

Monitor these collector metrics to know when rate limiting kicks in:

```bash
# Check the processor's sampling decision count

curl -s http://localhost:8888/metrics | \
  grep "otelcol_processor_tail_sampling_count_traces_sampled"

# Output will show policy-level metrics:
# otelcol_processor_tail_sampling_count_traces_sampled{policy="team-a-rate-limit",decision="sampled"} 12450
# otelcol_processor_tail_sampling_count_traces_sampled{policy="team-c-rate-limit",decision="not_sampled"} 45231
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

Per-tenant rate limiting is essential for any shared observability infrastructure. Without it, one noisy team can take down observability for everyone. The combination of routing connectors, tail-sampling rate limits, and memory limiters gives you a robust defense. Start with generous limits based on actual usage data, monitor sampling drops closely, and communicate limits clearly to your tenants.
