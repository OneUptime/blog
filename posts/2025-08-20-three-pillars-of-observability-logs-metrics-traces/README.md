# Logs, Metrics & Traces: How the Three Pillars of Observability Work Together

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: Observability, OpenTelemetry, Logs, Metrics, Traces, Open Source

Description: A practical guide to weaving logs, metrics, and traces into one observability fabric with OpenTelemetry, while avoiding Datadog / New Relic lock‑in and cutting costs using OneUptime.

Modern systems fail in nonlinear ways: partial outages, latent dependencies, retry storms, cold starts, noisy neighbors, thundering herds, region flaps - you name it. To reason about them, you don’t need *more dashboards, external monitoring like Ping Checks or Uptime Checks*; you need *connected signals*. That’s the promise of the three pillars of observability: **logs, metrics, and traces**. Alone they’re raw ingredients. Together they’re a narrative.


## Pillar 1: Metrics – Fast Answers, Slow Stories

Metrics are your system’s vital signs: time-series numbers optimized for *cheap storage, fast math, and real-time alerting*. 

> Metrics summarize state over time, but they don’t tell you *why* something happened. They answer: *How is my system performing?*

Strengths:
- Cheap to retain at high aggregation
- Great for SLOs / golden signals (latency, traffic, errors, saturation)
- Drive alerting and trend detection

Misuses:
- High cardinality free-for-all (user_id, request_id, session_id) → cost explosion (if you are using Datadog or New Relic, OneUptime fixes this)
- Trying to encode one-off events as counters
- Using metrics for forensic debugging (they summarize; they don’t narrate)

Design Tips:
- Define a bounded **cardinality budget** (e.g., env, region, service, endpoint)
- Keep **SLI metrics** minimal and intentional
- Derive *rates / percentiles* at ingest—don’t recompute everywhere

## Pillar 2: Logs – Infinite Detail, Zero Structure (Unless You Add It)

Logs are the unstructured (or semi-structured) breadcrumbs. They answer: *What exactly happened?* They’re flexible—but that flexibility kills budgets if unmanaged.

> Logs are your system’s *raw history*. They capture everything from debug statements to error traces. They answer: *What happened at this point in time?*

Strengths:

- Arbitrary context; great for exception snapshots and audit trails
- Legal / compliance retention (when sampled or tiered)
- Quick wins: you already log, you probaby dont ingest them yet which means you can start using them right away

Misuses:

- Firehosing debug logs in prod forever (cost explosion if this happens)
- Treating logs as your only signal (forces grep-driven operations)
- Forgetting to correlate with trace/span IDs

Cost Levers:

- **Sampling:** Keep 100% of `ERROR`, sample `INFO` 1–5%, drop `DEBUG` unless temporarily enabled
- **Tiering:** Hot (24–72h), Warm (7–30d), Cold (archival / object store)
- **Normalization:** Emit structured JSON early—don’t pay to parse later

## Pillar 3: Traces – The Causal Spine

Traces model the *story* of a request: a tree (or DAG) of spans across services. They answer: *Where is latency introduced? Which dependency failed?* and provide the join key for everything else.

> Traces are your system’s *causal spine*. They show how requests flow through your architecture, revealing dependencies and bottlenecks. They answer: *What is the path of execution?*

Strengths:
- Precise latency breakdown and critical path insight
- Natural correlation handle (trace_id / span_id)
- Surfaces concurrency, retries, fan-out, cascading failures

Misuses:
- Tracing *everything* at 100% and then going bankrupt
- Over-nesting spans (noise) or under-instrumenting (blind spots)
- Ignoring semantic conventions → inconsistent queries later

Design Tips:
- Pick a **baseline sampling rate** (e.g., 5–15%), then **tail-sample anomalies** (errors, high latency, rare routes)
- Use **OTel semantic conventions** for HTTP, DB, messaging, functions
- Add **span events** for retries, cache misses, queue delays

---

## Why They Must Converge

If your logs, metrics, and traces live in silos, you’re stuck pivoting manually:

Latency spike? → Which service? → Which deploy? → Which error? → Which user path?

Correlation pattern you want:

- Metric alert fires (p99 latency ↑)
- Links directly to a trace exemplar of the slow cohort
- Trace links to spans with error attributes or DB stall
- Span IDs found inside sampled structured logs
- Root cause isolated in < 5 minutes, not 50

**Metrics tell you something is wrong. Traces tell you where. Logs tell you why.**

---

## OpenTelemetry: The Neutral Data Plane

Think of OTel as the *“write once, route anywhere”* layer. Instrument once → ship to any backend (or multiple) without code changes.

Core Building Blocks:

- **Auto-Instrumentation:** Fast coverage for HTTP, gRPC, SQL, messaging
- **Manual Spans:** For business logic boundaries
- **Resource Attributes:** `service.name`, `deployment.environment`, `cloud.region`
- **Context Propagation:** W3C trace context / baggage across processes
- **Collector Processors:** batch, tail_sampling, transform, attributes, filter

### Minimal Vendor-Neutral Setup

1. Instrument app with OTel SDK + auto-instrumentation
2. Export telemetry to local **OTel Collector** (OTLP)
3. Collector routes:
   - Metrics → time series store
   - Traces → tracing backend
   - Logs → log store / object tier
4. Optionally duplicate to two backends during migration

```text
App → OTLP → Collector → (OneUptime)          
                      └→ (Secondary / S3 archive)
```

This indirection breaks hard coupling to any SaaS API.

---

## Avoiding Vendor Lock-In (and Bill Shock)

Lock-in shows up as:
- Proprietary agents you can’t replace
- Query languages only one vendor supports
- Features that depend on hidden ingestion pricing
- Non-exportable dashboards / monitors

Anti-Lock-In Playbook:

- Use OTel-native exporters; avoid vendor-specific shims when possible
- Keep **raw OTLP** archives (cheap object storage) for reprocessing
- Define SLOs in code / version control (infra-as-code + Terraform provider)
- Prefer **open standards**: W3C trace context, OpenAPI, OpenMetrics formats
- Test a *hot-swap* drill annually (switch trace backend for a day)

Cost Controls:

- Tail-based trace sampling (keep the interesting 100%)
- Metric cardinality guardrails (lint PRs for new high-card tags)
- Log routing: errors → hot; info/debug → sampled + cold tier
- Delete orphan dashboards & unused monitors quarterly

---

## Where OneUptime Fits

OneUptime is an **open-source, all-in-one observability and reliability platform**. Think of it as *“Datadog without the black box pricing & lock-in.”*

What you get:
- OTLP-native ingestion (drop-in with existing OTel setup)
- Unified views: incidents, monitors, traces, logs, metrics, status pages
- SLOs / alerts tied to real user & system signals
- OpenAPI spec + Terraform provider → everything as code
- Self-host or use hosted → your data, your control

Why it matters:
- You control retention & storage economics
- No per-host tax; pay based on actual ingestion (or infra if self-hosting)
- Swap *in* or *out* without rewriting instrumentation

If you already use OTel → you’re 80% done integrating OneUptime.

---

## Putting It All Together: A Flow
1. User hits `/checkout` → trace starts (trace_id propagated)
2. Downstream DB span exceeds latency SLO → span event recorded
3. Tail sampler keeps this trace (p99 outlier)
4. Metric alert (checkout latency > threshold) links exemplar trace
5. Error log line includes `trace_id=... span_id=...` → clicked from trace UI
6. Developer inspects DB span attributes: `db.system=postgres`, `rows=0`, `lock_wait_ms=1200`
7. Root cause: connection pool exhaustion after deploy (release marker on timeline)

Time to clarity: minutes, not an afternoon.

---

## Quick Start Checklist
- [ ] Add OpenTelemetry SDK + auto instrumentation
- [ ] Emit structured JSON logs with `trace_id`, `span_id`
- [ ] Run an OTel Collector (enable batch + tail_sampling processors)
- [ ] Send all three signals to OneUptime (and optionally a secondary sink)
- [ ] Define 3–5 SLOs (latency, error rate, availability)
- [ ] Enforce a metric & log retention policy
- [ ] Review sampling effectiveness monthly

---

## Common Pitfalls & Fixes
| Problem | Symptom | Fix |
|---------|---------|-----|
| Metric cardinality explosion | Slow queries, rising bill | Pre-aggregate; drop high-card tags |
| No trace-log link | Grepping logs blindly | Inject trace/span IDs into log context |
| Too many spans | UI unusable | Collapse internal functions; focus on boundaries |
| Trace volume cost | 100% sampling unsustainable | Tail + adaptive sampling |
| Vendor migration fear | "We can't change tools" | OTel Collector routing + archive raw OTLP |

---

## Final Take
Observability isn’t collecting “more stuff.” It’s **designing correlated signals** so you can ask novel questions *without shipping new code*. OpenTelemetry gives you the portability layer. OneUptime gives you an open, integrated, cost-transparent destination.

Own your telemetry. Don’t rent your visibility.

If you're spending heavily on Datadog or New Relic just to get the basics—start decoupling today. Instrument once with OTel, point it at OneUptime, and keep your options (and runway) open.

---

Need help instrumenting or migrating? The OneUptime community can help. Come say hi.
