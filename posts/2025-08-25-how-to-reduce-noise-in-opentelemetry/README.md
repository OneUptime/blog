# How to reduce noise in OpenTelemetry? Keep What Matters, Drop the Rest.

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Observability, OpenTelemetry, Logs, Metrics, Traces, Sampling, SLOs, Cardinality, Alerting, Cost Optimization

Description: A practical guide to reducing telemetry noise with OpenTelemetry—cutting cost & alert fatigue while surfacing the 5% of data that drives 95% of incident resolution.

> You don't need **more** telemetry. You need **relational, value‑dense** telemetry.

Engineering teams hit a wall when “just send it all” becomes the default. Bills spike. Dashboards multiply. Alerts desensitize on-call. Traces turn into a scrolling museum. Logs become grep adventures. Metrics explode in cardinality. The result: **you *have* data but not answers**.

This guide shows how to intentionally design an OpenTelemetry (OTel) pipeline that:

1. Surfaces *meaningful* anomalies fast (SLO-backed)
2. Correlates metrics ↔ traces ↔ logs seamlessly
3. Slashes volume & cost (without losing root-cause fidelity)
4. Keeps vendor optionality (portable OTLP + Collector)
5. Reduces MTTR while shrinking alert load & cognitive toil

---

## Core Principle: Optimize for Signal Density

| Signal | Keep 100%? | Strategy | Primary Question |
|--------|------------|----------|------------------|
| SLO / Golden Metrics | Yes | Curate + aggregate | "Is behavior drifting?" |
| Traces | No | Head + tail + policy | "Where / in which path?" |
| Logs | No | Level + structured sampling + tiering | "Why exactly?" |

Everything else routes through policy: *Does this improve time-to-diagnosis or time-to-learn? If not, compress / sample / drop*.

---

## Step 1: Start With Outcomes (Not Tools)

Define before instrumenting:

- Target MTTR (e.g. p50 < 10m, p90 < 25m)
- 3–5 SLOs (Latency, Availability, Error Rate, Critical Flow Success)
- Max tolerable weekly alert pages (e.g. < 30 actionable)
- Cardinality budget (per metric family)
- Sampling budget (target trace kept % & policies)

Write these down. Review monthly. Instrumentation *serves* these constraints.

---

## Step 2: Curate Metrics First (SLOs Drive Everything)

Golden Signals per service (example):

- `http.server.duration` (histogram)
- `http.server.request.count` (counter)
- `http.server.errors` (counter filtered on 5xx)
- Domain metric (e.g. `checkout.complete.count`)


> Prune vanity metrics ruthlessly. If it never appears in an incident review or capacity plan over 60 days → delete.

---

## Step 3: Design Trace Sampling (Keep the Weird 100%)

Baseline strategy:

1. **Head sample** 5–15% of all requests (probabilistic)
2. **Tail sample**: always keep traces with: errors, latency > p95, rare endpoints, high DB spans, specific customer tiers


Collector tail sampling enables this without code redeploy.

### OpenTelemetry Collector (Tail Sampling) Example

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    num_traces: 50000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ ERROR ]
      - name: high-latency
        type: latency
        latency:
          threshold_ms: 500 # adjust per service p95
      - name: rare-route
        type: string_attribute
        string_attribute:
          key: http.target
          values: [ "/checkout/confirm", "/billing/webhook" ]
      - name: vip-tenants
        type: string_attribute
        string_attribute:
          key: customer.tier
          values: [ "enterprise" ]
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
```

Add an upstream head sampler (e.g. 1–5%) in code to cap ingestion before the Collector (safety net) if you have bursty traffic.

---

## Step 4: Log Policy (Structured, Sampled, Tiered)

| Level | Sample | Hot Retention | Warm | Cold / Archive |
|-------|--------|--------------|------|----------------|
| ERROR | 100%   | 7d           | 30d  | 180d (obj store) |
| WARN  | 50%    | 3d           | 14d  | 90d             |
| INFO  | 5%     | 24h          | 3d   | 30d (compressed) |
| DEBUG | 0% (feature-flag episodic) | ephemeral | n/a | n/a |

Every log line MUST include correlation IDs (`trace_id`, `span_id`) and structured keys (no free-form dumps unless gated).

### Node.js (Pino) Logger with Trace Context Injection

```ts
import pino from 'pino';
import { context, trace } from '@opentelemetry/api';

export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  formatters: {
    level(label) { return { level: label }; }
  },
  timestamp: () => `,"ts":"${new Date().toISOString()}"`
});

export function logWithContext(level: 'info'|'warn'|'error'|'debug', msg: string, extra: Record<string, any> = {}) {
  const span = trace.getSpan(context.active());
  const spanCtx = span?.spanContext();
  logger[level]({
    ...extra,
    trace_id: spanCtx?.traceId,
    span_id: spanCtx?.spanId,
    service: process.env.OTEL_SERVICE_NAME
  }, msg);
}
```

### Express Middleware to Ensure Correlation
```ts
import { context, trace } from '@opentelemetry/api';
import type { Request, Response, NextFunction } from 'express';
import { logWithContext } from './logger';

export function requestLog(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();
  res.on('finish', () => {
    logWithContext('info', 'http_request', {
      method: req.method,
      path: req.path,
      status: res.statusCode,
      duration_ms: Date.now() - start
    });
  });
  next();
}
```

### Toggle Debug Sampling (Feature Flag)
```ts
if (process.env.DEBUG_TRACE === '1') {
  logWithContext('debug', 'Detailed payload', { payloadPreview: payload.slice(0, 128) });
}
```

---

## Step 5: Instrument Boundaries (Not Every Function)

Good span candidates:

- External calls (DB, cache, third-party HTTP)
- Queue publish / consume
- Business transaction boundaries (e.g. `OrderService.createOrder`)
- Async workflow transitions

Bad span candidates:

- Tight inner loops
- Simple value transforms
- Logger wrappers / trivial utilities

### Node.js OTel Setup (Minimal)

```ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import { PeriodicExportingMetricReader, AggregationTemporality } from '@opentelemetry/sdk-metrics';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-base';

const resource = new Resource({
  [SemanticResourceAttributes.SERVICE_NAME]: 'checkout-service',
  deployment_environment: process.env.DEPLOY_ENV || 'dev'
});

const traceExporter = new OTLPTraceExporter({});
const metricExporter = new OTLPMetricExporter({});

const sdk = new NodeSDK({
  resource,
  traceExporter,
  sampler: new ParentBasedSampler({ root: new TraceIdRatioBasedSampler(0.1) }), // 10% head sample
  metricReader: new PeriodicExportingMetricReader({
    exporter: metricExporter,
    exportIntervalMillis: 15000
  }),
  instrumentations: [getNodeAutoInstrumentations({
    '@opentelemetry/instrumentation-http': { ignoreIncomingRequestHook: (req) => req.url === '/healthz' }
  })]
});

sdk.start();
```

### Manual Span Example
```ts
import { trace } from '@opentelemetry/api';

async function authorizePayment(payment: PaymentInput) {
  const span = trace.getTracer('biz').startSpan('payment.authorize', {
    attributes: { amount: payment.amount, currency: payment.currency }
  });
  try {
    const gatewayResp = await callGateway(payment);
    span.setAttribute('gateway.latency_ms', gatewayResp.latency);
    if (!gatewayResp.approved) {
      span.setStatus({ code: 2, message: 'declined' });
    }
    return gatewayResp;
  } catch (e: any) {
    span.recordException(e);
    span.setStatus({ code: 2, message: e.message });
    throw e;
  } finally {
    span.end();
  }
}
```

---

## Step 6: Enrich Rather Than Explode Cardinality

Add *bounded* attributes: `service.name`, `env`, `region`, `version`, `customer.tier`.

Avoid unbounded: user IDs, session IDs, UUIDs, dynamic query params. Put those in logs (sampled) or span events.


---

## Step 7: Collector as Policy Engine

Full (trimmed) Collector pipeline:
```yaml
receivers:
  otlp:
    protocols:
      http:
      grpc:

processors:
  batch:
    send_batch_size: 512
    timeout: 5s
  tail_sampling: { ... as above ... }
  attributes:
    actions:
      - key: deployment.version
        value: ${DEPLOY_VERSION}
        action: upsert
  filter:
    traces:
      span:
        - 'attributes["http.target"] == "/healthz"'
  memory_limiter:
    limit_mib: 512
    spike_limit_mib: 128
    check_interval: 5s

exporters:
  # Export over HTTP
  otlphttp:
    endpoint: "https://oneuptime.com/otlp"
    # Requires use JSON encoder insted of default Proto(buf)
    encoding: json
    headers:
      "Content-Type": "application/json"
      "x-oneuptime-token": "ONEUPTIME_TOKEN" # Your OneUptime token
  logging:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, tail_sampling, attributes, filter]
      exporters: [otlphttp, logging]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlphttp]
```

---

## Step 8: Tier & Archive (Own Your Telemetry Economics)

Keep hot only what accelerates *active* diagnosis. Everything else: summarize / age-out / compress / object-store (raw OTLP if needed for reprocessing).

Pattern:

1. Retain aggregated metrics long-term (cheap)
2. Retain exemplar traces + recent anomaly windows
3. Archive raw unsampled trace envelopes (optional) to S3 (cold)
4. Rehydrate only for investigations (rare)

---

## Step 9: Continuous Tuning Loop

Monthly review:

- Top 10 traces kept reasons (policy effectiveness)
- Trace keep % vs. incident root-cause success
- Log ingestion GB vs. queries that produced answers
- Metrics cardinality diff (new label explosion?)
- Alert acknowledgement to actionable ratio

> Delete / reconfigure *something* every month. Entropy accumulates silently.

---

## Example: End-to-End Flow

1. User hits `/api/checkout` → head-sampled (10%).
2. Latency spikes to 780ms (above service p95 threshold) → tail sampler guarantees retention.
3. Error budget burn (fast window) triggers SLO alert.
4. Alert payload links exemplar trace ID `4a9df…`.
5. Trace shows `payment.authorize` span ballooning; event `retry_backoff` ×2.
6. Linked logs (sampled) show TLS handshake renegotiations for `gateway=eu-west-2` only.
7. Deploy marker 7 minutes earlier for canary region.
8. Rollback flagged version; latency normalizes; retro auto-attaches trace + logs.

Time to confident root cause: 6 minutes. Noise produced: minimal. Data cost: bounded.

---

## Common Anti-Patterns & Fixes

| Anti-Pattern | Why It Hurts | Replace With |
|--------------|-------------|--------------|
| 100% tracing firehose | Cost + UI unusable | Tail + targeted head sampling |
| Logging everything at INFO | Storage burn | Sampling + level discipline |
| Ad hoc dashboard sprawl | Cognitive tax | Versioned, reviewed dashboards |
| Unbounded metric labels | Cardinality blow-up | Label budget + PR lint |
| Alert per metric | Pager fatigue | SLO burn + a few anomaly alerts |

---

## Key Takeaways

- Reduction ≠ Blindness. You *gain* clarity by curating.
- OpenTelemetry Collector is your policy router: move logic *out* of code.
- SLO-first design prevents vanity telemetry.
- Correlate before you accumulate. Relationships beat volume.
- Treat telemetry like code: review, diff, prune.

> The goal isn’t “observe everything.” It’s “answer real questions fast—portably and economically.”

Own your signal density. Let tools (OneUptime included) *amplify* it, not drown it.

---

### Want More?

If you’d like a deeper dive (adaptive sampling configs, cost dashboards, span naming audits), open an issue or reach out. Happy to expand this into a part II.

**Related Reading:**

- [How to increase the size of the sending queue in OpenTelemetry Collector?](https://oneuptime.com/blog/post/2025-01-20-increase-size-of-open-telemetry-collector-queue/view)
- [How to collect internal metrics from OpenTelemetry Collector?](https://oneuptime.com/blog/post/2025-01-22-how-to-collect-opentelemetry-collector-internal-metrics/view)
- [What are Traces and Spans in OpenTelemetry: A Practical Guide](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
