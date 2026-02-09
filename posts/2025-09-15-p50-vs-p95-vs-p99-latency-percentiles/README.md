# P50 vs P95 vs P99 Latency: What These Percentiles Actually Mean (And How to Use Them)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Observability, Performance, Metrics, Latency, SLOs, Site Reliability Engineering, SRE, Reliability

Description: A practical guide to understanding P50, P95, and P99 latency percentiles- why averages lie, what each percentile tells you about user experience, how to set SLOs around them, and how to collect them correctly with histograms.

If you're new to SLOs and reliability metrics, you may also want to read: 
- What are Error Budgets? (https://oneuptime.com/blog/post/2025-09-03-what-are-error-budgets/view)
- Understanding MTTR, MTTD, MTBF and More (https://oneuptime.com/blog/post/2025-09-04-what-is-mttr-mttd-mtbf-and-more/view)
- The Five Stages of SRE Maturity (https://oneuptime.com/blog/post/2025-09-01-the-five-stages-of-sre-maturity/view)

---

## Quick Answer (TL;DR)

- P50 (median): What a “typical” user sees. Half of requests are faster, half slower.
- P95: Tail latency early warning. 5% of requests are worse than this.
- P99: Critical tail. The worst 1% of requests- often where high-value traffic lives (checkout, admin, APIs under load).
- Mean (average): Misleading in skewed distributions. Don’t use as your primary latency SLI.
- Use P50 to detect broad regressions, P95 to tune system performance, P99 to expose architectural bottlenecks & outliers.
- Never chase P100. The single slowest request is noise.

---

## Why Not Just Use Average Latency?

Because latency is rarely normally distributed, it’s long-tailed. A handful of very slow outliers (GC pauses, cold starts, retries, network hiccups, lock contention) can inflate the average without affecting most users. The median (P50) ignores those extremes and anchors on the typical experience.

Example: 10,000 requests
- 9,400 finish in 50 ms
- 500 finish in 120 ms
- 90 finish in 600 ms
- 10 finish in 8,000 ms

Average ≈ (9400*50 + 500*120 + 90*600 + 10*8000)/10000 = ~118 ms  (looks bad)
Median = 50 ms (most users fine)
P95 ≈ around 120–130 ms
P99 ≈ around 600 ms

If you optimized blindly for the average, you might waste time chasing rare anomalies instead of systematic tail behaviors.

---

## What a Percentile Actually Means

P95 = 95% of requests completed in <= that latency. It does NOT mean "95% are exactly at that number." It's a rank threshold.

Mathematically: Sort all request durations ascending. The value at index floor(0.95 * N) (1-index aware) is the 95th percentile.

Percentiles give you a distribution-aware lens, which is why SRE, performance tuning, and capacity planning revolve around them.

---

## Typical Interpretation Framework

| Percentile | Purpose | Common Use |
|------------|---------|------------|
| P50 | Baseline health / median user | Detect broad regressions (deploys) |
| P75 (optional) | Early mid-tail | UI animation smoothness / partial load events |
| P90 / P95 | General tail | Alerting (secondary), performance tuning |
| P99 | Critical tail | SLO (sometimes), debugging outliers, architectural redesign |
| P99.9 | Extreme tail | High-frequency trading, ultra-low latency systems |

You probably don’t need anything beyond P99 unless you're in finance, gaming latency-sensitive interactions, or real-time bidding.

---

## Which Percentiles Should Be in an SLO?

Guidelines:
- User-facing web/API: Availability SLO + latency SLO at P95 (e.g. 95% of logins under 300 ms) and optionally track P99.
- Internal platform service: Often P95 for consumption predictability; track P99 for capacity anomalies.
- Highly interactive UI (perceived responsiveness): P75 for paint/interaction + P95 for completion (e.g. search results).
- Streaming / background: Focus on throughput & success rates before latency percentiles.

Avoid putting both P95 and P99 in hard SLO error budget policies early on- you’ll cause alert fatigue. Track first, promote later if stable.

---

## How Percentiles Map to Architecture Problems

| Observation | Likely Cause | Action |
|-------------|-------------|--------|
| P50 shift upward suddenly | Deployment regression / config change | Rollback or bisect |
| Stable P50, growing P95 | Contention, queue buildup, load imbalance | Add capacity / smooth load / tune pool sizes |
| P95 fine, P99 spiking | Rare GC pauses, cold starts, noisy neighbors | Tune runtime, pre-warm, isolate workloads |
| P99 plateau (hard floor) | Upstream dependency blocking | Add timeouts / concurrency controls |
| All percentiles climb together | Global resource saturation | Scale horizontally / profile hotspots |
| P50 steady, P99 drifts over days | Memory fragmentation / unbounded queues | Add backpressure / periodic resets |

---

## Alerting Philosophy

Don’t page on every percentile breach. Strategy:
1. Primary latency SLO (often P95) with burn-rate based alerts (fast + slow windows).
2. P99 anomalies feed into dashboards / secondary alerts if sustained.
3. Use ratio alerts: “P99 > 3 × P50 for 15m” to spot divergence.
4. Correlate with error rate and saturation metrics before acting.

Reference: SLO burn-based alerting pattern (see The Ultimate SRE Reliability Checklist: https://oneuptime.com/blog/post/2025-09-10-sre-checklist/view)

---

## How to Collect Percentiles Correctly

Never compute percentiles by storing every raw value in memory (costly) or by averaging previously averaged numbers (mathematically wrong). Use:
- HDR Histograms
- t-digest
- OpenTelemetry histogram instruments (which aggregate into explicit bucket histograms)

Then your backend (e.g., OneUptime) computes quantiles over histogram buckets.

### Example (OpenTelemetry Metrics - TypeScript)

This example shows how to properly instrument HTTP request latency using OpenTelemetry histograms. Histograms automatically bucket your data, allowing backends like OneUptime to calculate accurate P50, P95, and P99 values without storing every individual measurement.

```ts
// OpenTelemetry Latency Instrumentation Example
// ==============================================
// This setup enables accurate percentile calculations on your metrics backend

import { MeterProvider, PeriodicExportingMetricReader } from '@opentelemetry/sdk-metrics';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { diag, DiagConsoleLogger, DiagLogLevel } from '@opentelemetry/api';

// Enable diagnostic logging for debugging instrumentation issues
// Set to DiagLogLevel.DEBUG during development, INFO or WARN in production
diag.setLogger(new DiagConsoleLogger(), DiagLogLevel.INFO);

// Configure the OTLP exporter to send metrics to your observability backend
// Replace the URL with your actual telemetry endpoint (e.g., OneUptime, Jaeger)
const exporter = new OTLPMetricExporter({
  url: 'https://telemetry.your-backend.example/v1/metrics'
});

// Set up the meter provider - this is the entry point for creating metrics
const meterProvider = new MeterProvider({});

// Add a periodic reader that exports metrics every 60 seconds
// Adjust exportIntervalMillis based on your needs:
// - Lower (10-30s): More granular data, higher cost
// - Higher (60-120s): Less granular, lower cost
meterProvider.addMetricReader(
  new PeriodicExportingMetricReader({
    exporter,
    exportIntervalMillis: 60000  // Export every 60 seconds
  })
);

// Get a meter for your service - use a descriptive name matching your service
const meter = meterProvider.getMeter('checkout-service');

// Create a histogram instrument for tracking request latency
// Histograms are ESSENTIAL for percentile calculations (P50, P95, P99)
// Do NOT use counters or gauges for latency - they lose distribution info
const requestLatency = meter.createHistogram('http.server.request.duration', {
  description: 'Inbound request processing duration',
  unit: 'ms'  // Always specify units for clarity
});

// Example: Instrumenting an HTTP request handler
async function handleRequest(req, res) {
  // Capture start time with high precision
  const start = performance.now();  // More accurate than Date.now()

  try {
    // ... your business logic goes here ...
    res.statusCode = 200;
    res.end('ok');
  } catch (err) {
    // Record errors but don't let instrumentation fail the request
    res.statusCode = 500;
    res.end('error');
  } finally {
    // ALWAYS record duration in finally block to capture all requests
    // This ensures failed requests are measured too (important for P99!)
    const duration = performance.now() - start;

    // Record the latency with dimensional attributes
    // These attributes enable filtering: P99 by route, by method, etc.
    requestLatency.record(duration, {
      route: req.route?.path || 'unknown',  // e.g., '/api/checkout'
      method: req.method,                    // e.g., 'POST'
      status_code: res.statusCode            // e.g., 200, 500
    });
    // WARNING: Avoid high-cardinality attributes like user_id or request_id
    // They will explode your metrics storage costs
  }
}
```

Your backend can now calculate P50/P95/P99 for `http.server.request.duration` filtered by attributes.

---

## Why P99 Feels Hard to Improve

Because it exposes rare, systemic friction:
- Cold start of a rarely invoked Lambda/function
- JVM/JIT warmup or class loading
- Cache misses falling back to slower datastore
- Lock convoying (many threads waiting on a single lock)
- Coordinated GC pauses
- Thundering herd retries after a transient failure

Fixes often require architectural or workload-shaping changes (pre-warming, partitioning, caching layers, concurrency isolation, adaptive retries).

---

## Relating Percentiles to Error Budgets

You can structure a latency SLO as: “95% of checkout requests complete under 300 ms over 30 days.” The 5% overage is your latency error budget. Burn it too fast? Slow feature rollout and prioritize performance work. Combine with availability error budgets to balance reliability dimensions.

More on SLOs & budgets: https://oneuptime.com/blog/post/2023-06-12-sli-sla-slo/view and https://oneuptime.com/blog/post/2025-09-03-what-are-error-budgets/view

---

## Tooling Tips

- Use one platform (e.g. OneUptime) so traces, metrics, logs, and SLO burn are correlated.
- Store latency as a histogram, not a counter of rolled-up percentiles.
- Tag latency metrics with stable dimensions only (method, route template, status_code, region). Avoid user-specific labels.
- Track request volume alongside percentiles- P99 with 20 requests means little.
- Add deploy markers to correlate shifts.

---

## Practical Dashboard Layout

1. Request volume
2. P50 / P95 / P99 latency side by side (same y-axis)
3. Error rate (5xx) & saturation (CPU, queue depth) below
4. Histogram heatmap (latency buckets over time)
5. Correlated trace exemplars (slow traces pinned for P99 band)
6. Recent deploy / config event annotations

This layout reduces “time to probable cause.”

---

## Summary

Percentiles are about distribution clarity, not pedantic math. Use P50 to represent typical experience, P95 to manage general tail performance, and P99 to expose structural inefficiencies. Instrument with histograms, alert on SLO burn not raw spikes, and iterate based on real user impact.

Reliability is earned by designing for the long tail- not just the median.

---
