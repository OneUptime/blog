# What are Traces and Spans in OpenTelemetry: A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tracing, Traces, Observability, TypeScript, NodeJS

Description: A comprehensive, practical guide to understanding traces and spans in OpenTelemetry—how they work, how they relate, and how to instrument real Node.js / TypeScript applications effectively for deep insight and faster debugging.

---

> Metrics tell you **what** changed. Logs tell you **why** something happened. **Traces tell you *where* time was spent and *how* a request moved across your system.**

At the heart of distributed tracing in OpenTelemetry are two core concepts:

- **Trace**: The full journey of one request / transaction across services.
- **Span**: A timed unit of work inside that journey (function call, DB query, external API call, queue processing, etc.).

This guide walks through how traces and spans are structured, how context is propagated, how to model work properly, and how to implement everything in Node.js / TypeScript with practical patterns you can copy into production.

---

## Table of Contents

1. Core Concepts
2. Anatomy of a Span
3. Visual Mental Model
4. Setting Up Tracing in Node.js
5. Manual Instrumentation Basics
6. Express / Fastify Middleware Example
7. Database + External Call Spans
8. Error Recording & Status
9. Attributes, Events & Links
10. Context Propagation (Sync + Async)
11. Sampling (Head & Tail)
12. Span Naming Best Practices
13. Common Anti-Patterns
14. Putting It All Together
15. Next Steps (Correlating with Metrics & Logs)

---

## 1. Core Concepts

| Concept | Description (Plain Language) |
|---------|------------------------------|
| Trace | The full story of a single request. Made of many spans. Has a `trace_id` so all pieces stay linked. |
| Span | One timed step in that story (e.g., DB query, HTTP call, function). Starts, ends, and carries metadata. |
| Root Span | The first span (no parent). Usually the inbound HTTP request, queue message, or scheduled job trigger. |
| Child Span | A smaller step inside a bigger one. Lets you break work into clear pieces. |
| Context | The “current trace + active span” that rides along your async calls and network hops so new spans attach correctly. |
| Sampler | The rule that decides: keep (record/export) this trace or drop it to save cost/noise. |
| Exporter | The piece that ships finished spans to your backend (OneUptime, Jaeger, Tempo, etc.). |

Quick analogy (HTTP request version): A trace is the entire lifecycle of one HTTP request from accept to response. The root span is the server receiving the request. Child spans are each stage: auth middleware, controller handler, database query, cache lookup, external API call, response serialization. Context is the request-scoped metadata that flows through each layer so new spans attach correctly. The sampler is the decision point that says “do we keep detailed timing for this request or drop it?” The exporter is the component that ships the finished request timeline to your observability backend (OneUptime, Jaeger, Tempo, etc.).

---

## 2. Anatomy of a Span (Plain English)

Think of a span as an operation in your code (like a function call / database call) with a small JSON blob of context.

| Piece | What It Is | Why It Matters |
|-------|-------------|----------------|
| Name | A short label (e.g. `db.query.users.select`) | Shows up in UI & search; keep it stable & low-cardinality. |
| Start / End Time | High‑precision timestamps | Lets you calculate exact duration & order of operations. |
| Span ID | Unique ID for this span | Links this node inside the trace tree. |
| Trace ID | Shared ID across all spans in the same request | Groups everything so you can view the whole journey. |
| Parent Span ID | The ID of the span that spawned this one (optional) | Builds the tree hierarchy. Missing = root span. |
| Attributes | Key/value pairs (e.g. `http.method=GET`) | Filter, group, aggregate, and diagnose quickly. Avoid PII. |
| Events | Timestamped notes inside the span | Mark milestones (retry, cache_miss) without creating new spans. |
| Status | OK, ERROR, or UNSET + optional message | Surfaces failures fast; ERROR often drives alerting or tail sampling. |
| Links | References to spans from other traces | Connect workflows (fan-out, async, message handoff) without parent/child. |
| Kind | SERVER, CLIENT, INTERNAL, PRODUCER, CONSUMER | Tells the backend how to interpret direction & role. |

Minimal example (conceptually):

```jsonc
{
	"trace_id": "4f3ae9...",
	"span_id": "92ab13...",
	"parent_span_id": "d1c044...",
	"name": "db.query.users.select",
	"start": 1717080672.123456,
	"end": 1717080672.145221,
	"attributes": {"db.system": "postgresql", "db.rows": 3},
	"events": [{"name": "retry", "time": 1717080672.130001, "attributes": {"attempt": 1}}],
	"status": {"code": "OK"},
	"kind": "CLIENT"
}
```

Rules of thumb:
- If you can’t describe the work in one verb phrase → maybe it’s multiple spans.
- If you have > ~25 spans for a simple request → you might be over-instrumenting.
- Prefer attributes over putting details in the span name.


--- 

## 3. Visual Mental Model

Plain tree first:

```
Trace (HTTP GET /checkout)
└─ Root: HTTP GET /checkout
	 ├─ inventory.reserve
	 ├─ db.query.products.select
	 ├─ payment.api.charge
	 │   ├─ dns.lookup
	 │   └─ tls.handshake
	 └─ kafka.produce.order.created
```

Same thing with timing ideas (length ≈ duration):

```
HTTP GET /checkout  |=============================|
	inventory.reserve |====| 
	db.query.products |===|
	payment.api.charge        |----------|
		dns.lookup              |-| 
		tls.handshake              |--|
	kafka.produce.order.created          |==|
```

Reading this:
1. `payment.api.charge` dominates latency → investigate there first.
2. DNS + TLS are nested inside the payment call (network setup cost).
3. Work is mostly sequential (little overlap) → potential parallelization later.

If you only had logs you’d guess. With spans you *see* where time went.

---

### Span Kind Explained

The span kind answers a simple question: "What role is this operation playing in the overall flow?" It adds directional semantics so your backend can do smarter grouping (e.g., separating inbound server latency from outbound dependency calls).

| Kind | When To Use | Think Of It As | Common Attributes |
|------|-------------|----------------|------------------|
| SERVER | Handling an incoming request that originated outside this process (HTTP server, gRPC server, message consumer if you treat the message as a request) | Entry point | `http.method`, `http.route`, `messaging.operation=process` |
| CLIENT | Making an outbound call to another service or dependency (HTTP fetch, gRPC client, DB driver if not auto-instrumented) | Outbound dependency | `http.method`, `http.url`, `db.system` |
| INTERNAL | Pure in-process work that is neither an inbound nor outbound boundary (algorithmic step, domain service call) | Implementation detail | Domain-specific attributes |
| PRODUCER | Publishing/sending a message to a broker/queue/stream (Kafka produce, RabbitMQ publish) | Enqueue action | `messaging.operation=publish`, topic/queue name |
| CONSUMER | Receiving/processing a message from a broker/queue/stream (Kafka poll, SQS receive) | Dequeue processing | `messaging.operation=process`, ack state |

Quick decision tree:
1. Is this the first span created when the request hit this service? → SERVER.
2. Are we calling something else over the network? → CLIENT.
3. Are we putting a message on a queue/stream? → PRODUCER.
4. Are we handling a message pulled from a queue/stream? → CONSUMER.
5. Otherwise → INTERNAL.

Why it matters:
- Latency breakdown dashboards often separate SERVER vs CLIENT time.
- Some backends collapse INTERNAL spans by default to reduce noise.
- PRODUCER/CONSUMER clarify asynchronous hops so you can see queue handoff latency.

Common pitfalls:
- Marking everything INTERNAL (loses semantics).
- Using SERVER for background cron jobs (better: INTERNAL or a synthetic root INTERNAL span). If it's externally triggered (e.g., HTTP webhook) then SERVER is correct.
- Using CLIENT for DB calls when the instrumentation already sets the appropriate kind (double-wrapping spans).

Node.js example:

```typescript
import { trace, SpanKind } from '@opentelemetry/api';
const tracer = trace.getTracer('example');

// 1. Incoming HTTP (auto-instrumentation usually creates this SERVER span for you)
// Assume we already have an active SERVER span here.

// 2. Outbound HTTP call (CLIENT)
const clientSpan = tracer.startSpan('inventory.api.get', { kind: SpanKind.CLIENT, attributes: { 'http.method': 'GET' } });
// ... perform fetch
clientSpan.end();

// 3. Internal calculation (INTERNAL)
const internalSpan = tracer.startSpan('pricing.compute', { kind: SpanKind.INTERNAL });
// ... CPU work
internalSpan.end();

// 4. Publish message (PRODUCER)
const produceSpan = tracer.startSpan('kafka.produce.order', { kind: SpanKind.PRODUCER, attributes: { 'messaging.destination': 'orders' } });
// ... send to Kafka
produceSpan.end();

// 5. Consume message (CONSUMER) – in a worker process
const consumerSpan = tracer.startSpan('kafka.consume.order', { kind: SpanKind.CONSUMER, attributes: { 'messaging.destination': 'orders' } });
// ... process payload
consumerSpan.end();
```

When PRODUCER and CONSUMER are used correctly, you can measure:
1. Time inside the producing service (PRODUCER span duration)
2. Queue / broker delay (difference between PRODUCER end and CONSUMER start)
3. Processing time (CONSUMER span duration)

That separation helps answer: "Are we slow, or is the queue backed up?"

If you skip span kind entirely, everything defaults to INTERNAL and you lose this analytical power.

---

## 4. Setting Up Tracing in Node.js

Install dependencies:

```bash
npm install @opentelemetry/api \
						@opentelemetry/sdk-node \
						@opentelemetry/auto-instrumentations-node \
						@opentelemetry/exporter-otlp-http \
						@opentelemetry/resources \
						@opentelemetry/semantic-conventions
```

### telemetry.ts

```typescript
// telemetry.ts
import { NodeSDK } from '@opentelemetry/sdk-node';
import { getNodeAutoInstrumentations } from '@opentelemetry/auto-instrumentations-node';
import { OTLPTraceExporter } from '@opentelemetry/exporter-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import { ParentBasedSampler, TraceIdRatioBasedSampler } from '@opentelemetry/sdk-trace-node';

// Export traces to OneUptime via OTLP HTTP
const traceExporter = new OTLPTraceExporter({
	url: process.env.ONEUPTIME_OTLP_TRACES_ENDPOINT || 'https://oneuptime.com/otlp/v1/traces',
	headers: { 'x-oneuptime-token': process.env.ONEUPTIME_OTLP_TOKEN || '' },
});

// 10% sampling for new root traces, child decisions follow parent
const sampler = new ParentBasedSampler({
	root: new TraceIdRatioBasedSampler(parseFloat(process.env.OTEL_TRACES_SAMPLING_RATE || '0.1')),
});

export const sdk = new NodeSDK({
	traceExporter,
	sampler,
	resource: new Resource({
		[SemanticResourceAttributes.SERVICE_NAME]: 'checkout-service',
		[SemanticResourceAttributes.SERVICE_VERSION]: '1.2.3',
		[SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: process.env.NODE_ENV || 'development',
	}),
	instrumentations: [getNodeAutoInstrumentations()],
});

export async function startTelemetry() {
	await sdk.start();
	console.log('✅ OpenTelemetry tracing started');
}

export async function shutdownTelemetry() {
	await sdk.shutdown();
}
```

Initialize this BEFORE importing the rest of your app (so auto-instrumentation wraps modules):

```typescript
// index.ts (entrypoint)
import './telemetry';
import { startTelemetry } from './telemetry';
import { startServer } from './server';

startTelemetry().then(startServer);
```

---

## 5. Manual Instrumentation Basics

```typescript
// tracing-utils.ts
import { trace, context, SpanStatusCode } from '@opentelemetry/api';

const tracer = trace.getTracer('checkout-tracer', '1.0.0');

export async function withSpan<T>(
	name: string,
	fn: (span: ReturnType<typeof tracer.startSpan>) => Promise<T> | T,
	attrs: Record<string, any> = {}
): Promise<T> {
	const span = tracer.startSpan(name, { attributes: attrs });
	try {
		return await context.with(trace.setSpan(context.active(), span), async () => {
			const result = await fn(span);
			return result;
		});
	} catch (err: any) {
		span.recordException(err);
		span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
		throw err;
	} finally {
		span.end();
	}
}

export { tracer };
```

Usage:

```typescript
// inventory.ts
import { withSpan } from './tracing-utils';

export async function reserveInventory(sku: string, qty: number) {
	return withSpan('inventory.reserve', async (span) => {
		span.setAttribute('inventory.sku', sku);
		span.setAttribute('inventory.requested_qty', qty);
		// ... business logic
		await new Promise(r => setTimeout(r, 25));
		span.setAttribute('inventory.allocated_qty', qty);
		return { success: true };
	});
}
```

---

## 6. Express Middleware (Root Spans + Child Spans)

Auto-instrumentation handles HTTP server spans, but custom middleware gives you more control:

```typescript
// server.ts
import express from 'express';
import { tracer } from './tracing-utils';
import { reserveInventory } from './inventory';
import { processPayment } from './payments';
import { shipOrder } from './shipping';
import { context, trace, SpanKind } from '@opentelemetry/api';

export function startServer() {
	const app = express();
	app.use(express.json());

	app.post('/checkout', async (req, res, next) => {
		// Use existing active span created by auto-instrumentation
		const activeSpan = trace.getSpan(context.active());
		activeSpan?.setAttribute('checkout.user_id', req.body.userId || 'anonymous');
		activeSpan?.setAttribute('checkout.cart_size', req.body.items?.length || 0);

		try {
			await reserveInventory('SKU-123', 2);
			await processPayment(req.body.paymentToken, 42.5);
			await shipOrder('SKU-123');
			res.json({ status: 'ok' });
		} catch (e) {
			next(e);
		}
	});

	app.listen(3000, () => console.log('HTTP server on :3000'));
}
```

---

## 7. Database + External Call Spans

```typescript
// db.ts
import { tracer } from './tracing-utils';
import { SpanStatusCode } from '@opentelemetry/api';

export async function query(sql: string, params: any[]) {
	const span = tracer.startSpan('db.query', {
		attributes: {
			'db.system': 'postgresql',
			'db.statement': sql, // Consider truncation for sensitive data
		},
	});
	try {
		await new Promise(r => setTimeout(r, 15)); // simulate latency
		span.setAttribute('db.rows', 3);
		return [{ id: 1 }, { id: 2 }];
	} catch (err: any) {
		span.recordException(err);
		span.setStatus({ code: SpanStatusCode.ERROR });
		throw err;
	} finally {
		span.end();
	}
}

// external.ts
import fetch from 'node-fetch';
import { tracer } from './tracing-utils';
import { SpanKind } from '@opentelemetry/api';

export async function callPaymentGateway(token: string, amount: number) {
	const span = tracer.startSpan('payment.api.charge', { kind: SpanKind.CLIENT, attributes: { amount } });
	try {
		const res = await fetch('https://payments.example.com/charge', { method: 'POST' });
		span.setAttribute('http.status_code', res.status);
		return await res.json();
	} finally {
		span.end();
	}
}
```

---

## 8. Error Recording & Status

Always set status + record exception:

```typescript
try {
	// ...
} catch (err: any) {
	span.recordException(err);
	span.setStatus({ code: SpanStatusCode.ERROR, message: err.message });
	throw err;
}
```

Do NOT put PII (e.g., emails, tokens) inside attributes or error messages.

---

## 9. Attributes, Events & Links

### Attributes
Structured key/value metadata for filtering & aggregation.

```typescript
span.setAttribute('cache.hit', true);
span.setAttribute('retry.count', 2);
```

### Events
Events are timestamped annotations that live *inside* a span. They answer: "What important thing happened at this specific moment while this span was running?" They do **not** represent separate units of work (that’s what child spans are for), and they do **not** replace logs (logs can be unbounded, free‑form; events should be concise & structured).

Use events for:
- Milestones: `validation.start`, `cache.miss`, `retry`, `circuit.breaker.open`
- State transitions: `order.status.changed`
- Intermittent detail you may want to filter on later (but not enough to justify a new span)

Avoid events for:
- Highly repetitive signals (loop iterations, per-row processing)
- Bulk debug dumping (use logs with trace/span IDs instead)
- Long-running operations (use a child span instead so you get duration)

Example (retry flow):
```typescript
span.addEvent('payment.attempt', { attempt: 1 });
// call fails
span.addEvent('payment.retry_scheduled', { after_ms: 250 });
// second try
span.addEvent('payment.attempt', { attempt: 2, final: true });
```

Events vs spans vs logs (quick guide):
| You need | Use |
|----------|-----|
| Duration of a sub-operation | Child span |
| Single point-in-time marker | Event |
| Rich, possibly verbose diagnostic output | Log (with trace + span IDs) |
| Structured milestone you may query/filter | Event (with attributes) |

Best practices:
- Limit to a handful (e.g., < 15) per span or you risk noise.
- Prefer consistent event names (`verb.noun` or `domain.action`).
- Add minimal attributes (keep cardinality low: `attempt`, `status`, not `user_id`).

Anti‑patterns:
- Turning every function call into an event.
- Emitting repeating per-element events in large batches.
- Using events to store big blobs (stick to small primitives / short strings).

### Links
Links connect the current span to *other* span contexts **without** establishing a parent/child relationship. Use them when there isn’t a single clear parent or when you intentionally want to keep traces separate but correlated.

Typical use cases:
1. Fan-out / fan-in: An aggregator span links to many upstream spans it’s merging results from.
2. Batch processing: A worker processes a batch of messages from different original traces; each message’s original context is linked.
3. Message queue hops when you purposely start a *new* trace per consumer but still want to show lineage.
4. Long-running orchestrator referencing shorter-lived transactional spans.
5. Stitching after context loss (recover partial context from headers/logs and link rather than fake parenting).

Child span vs link decision:
| Scenario | Use Child Span | Use Link |
|----------|----------------|----------|
| Direct causal, synchronous or awaited work | ✅ | ❌ |
| Multiple equally-important source contexts | ❌ | ✅ |
| You want one coherent end-to-end trace | ✅ | (Usually not) |
| Data arrives from many unrelated traces | ❌ | ✅ |
| Async message consumed and you continue original trace | ✅ (propagate) | ❌ |
| New trace per consumed message but still correlate | ❌ | ✅ |

Code examples:

Linking multiple prior spans (batch aggregation):
```typescript
import { trace, context } from '@opentelemetry/api';
const tracer = trace.getTracer('batch-aggregator');

// Suppose we decoded contexts from 3 messages
function aggregate(messages: { spanContext: any; payload: any }[]) {
	const links = messages.map(m => ({ context: m.spanContext, attributes: { source: 'queue' } }));
	const span = tracer.startSpan('batch.aggregate', { links });
	try {
		// ... combine payloads
	} finally { span.end(); }
}
```

Starting a new trace but linking to original (decoupled async stage):
```typescript
import { context as otelContext, trace } from '@opentelemetry/api';
function processEvent(originalSpanContext: any) {
	const tracer = trace.getTracer('analytics-pipeline');
	// No parent: intentionally new root
	const span = tracer.startSpan('analytics.enrich', { links: [{ context: originalSpanContext }] });
	// ... enrichment logic
	span.end();
}
```

Recovering partial context from headers (e.g., only trace id present):
```typescript
import { isSpanContextValid, SpanContext, trace } from '@opentelemetry/api';

function startSpanWithRecoveredContext(recovered: Partial<SpanContext>) {
	const tracer = trace.getTracer('recovery');
	// If we can’t validate as a proper parent, link instead of forging one
	const links = isSpanContextValid(recovered as SpanContext) ? [{ context: recovered as SpanContext, attributes: { recovered: true } }] : [];
	const span = tracer.startSpan('recovered.work', { links });
	span.end();
}
```

Metrics impact: links do not create additional timing branches, so they are cheaper than extra spans while still preserving relationship.

Warning: Overusing links to approximate parenting makes traces harder to understand—use them intentionally, not as a default.

---

## 10. Context Propagation (Async Boundaries)

Node's async model can lose context if instrumentation is incomplete. OpenTelemetry patches most core libs, but for custom async boundaries:

```typescript
import { context, trace } from '@opentelemetry/api';

function scheduleWork(fn: () => Promise<void>) {
	const activeCtx = context.active();
	setTimeout(() => {
		context.with(activeCtx, () => { fn(); });
	}, 10);
}

export function runWorkflow() {
	const tracer = trace.getTracer('workflow');
	const span = tracer.startSpan('workflow.run');
	context.with(trace.setSpan(context.active(), span), () => {
		scheduleWork(async () => {
			const child = tracer.startSpan('delayed.step');
			await new Promise(r => setTimeout(r, 20));
			child.end();
			span.end();
		});
	});
}
```

Propagation over HTTP / messaging uses W3C `traceparent` + `tracestate` headers. Example injecting outbound request:

```typescript
import { propagation, trace, context } from '@opentelemetry/api';
import fetch from 'node-fetch';

async function outboundCall() {
	const tracer = trace.getTracer('client');
	return tracer.startActiveSpan('external.call', async (span) => {
		const headers: Record<string,string> = {};
		propagation.inject(context.active(), headers);
		const res = await fetch('https://api.example.com/data', { headers });
		span.setAttribute('http.status_code', res.status);
		span.end();
		return res.json();
	});
}
```

---

## 11. Sampling

### Head Sampling
Decided at trace start (e.g., `TraceIdRatioBasedSampler`). Pros: low overhead. Cons: may miss interesting rare traces.

### Tail Sampling (Collector)
Decision after seeing entire trace (e.g., keep only errors or slow ones). Configure in OpenTelemetry Collector:

```yaml
processors:
	tail_sampling:
		decision_wait: 5s
		num_traces: 50000
		policies:
			- name: errors
				type: status_code
				status_code:
					status_codes: [ ERROR ]
			- name: slow
				type: latency
				latency:
					threshold_ms: 500
			- name: traffic-sample
				type: probabilistic
				probabilistic:
					sampling_percentage: 10
```

Use head sampling for baseline + tail sampling to enrich with high-value traces.

---

## 12. Span Naming Best Practices

Good names are stable, low-cardinality, action-oriented:

| Bad | Good |
|-----|------|
| getUserById_123 | user.fetch |
| SELECT * FROM users WHERE id=1 | db.query.users.select |
| callStripe | payment.gateway.charge |
| process | order.fulfillment.stage1 |

Server spans: `HTTP {METHOD} {ROUTE}` => `HTTP GET /checkout`

DB spans: `db.query.<table>.<operation>`

External API: `<domain_group>.<resource>.<action>`

Background job: `job.<queue>.<task>`

---

## 13. Common Anti-Patterns

1. Span explosion (creating spans inside tight loops > thousands/second).
2. High-cardinality span names (embedding IDs, timestamps).
3. Logging everything as events (events should be selective).
4. PII in attributes (violates privacy/compliance).
5. Mixing domains in one span (split DB, cache, external API).
6. Forgetting to end spans (leads to memory leaks / incomplete traces).

---

## 14. Putting It All Together (Composite Example)

```typescript
// order-service.ts
import { tracer, withSpan } from './tracing-utils';
import { reserveInventory } from './inventory';
import { callPaymentGateway } from './external';
import { query } from './db';
import { SpanStatusCode } from '@opentelemetry/api';

interface OrderInput { userId: string; items: { sku: string; qty: number }[]; total: number; }

export async function createOrder(order: OrderInput) {
	return withSpan('order.create', async (span) => {
		span.setAttribute('order.item_count', order.items.length);
		span.setAttribute('order.total', order.total);

		span.addEvent('order.validation.start');
		if (order.total <= 0) {
			span.setStatus({ code: SpanStatusCode.ERROR, message: 'Invalid total' });
			throw new Error('Invalid total');
		}
		span.addEvent('order.validation.end');

		for (const item of order.items) {
			await reserveInventory(item.sku, item.qty);
		}

		await withSpan('order.payment', async (child) => {
			const result = await callPaymentGateway('token', order.total);
			child.setAttribute('payment.approved', !!result);
		});

		await withSpan('order.persist', async () => {
			await query('INSERT INTO orders ...', []);
		});

		span.addEvent('order.complete');
		return { id: 'ord_123', ...order };
	});
}
```

---

## 15. Next Steps (Correlating Signals)

- Add metrics for latency percentiles of `order.create` (histogram) to monitor trends.
- Emit structured logs with `trace_id` / `span_id` for deep root-cause analysis.
- Use tail sampling to always keep failed `order.payment` spans.
- Derive SLOs from success latency + error rate.

---

## Summary

| You Want To Know | Use Traces & Spans For |
|------------------|------------------------|
| Where time is spent | Latency breakdown inside a single request |
| Which dependency is slow | Span-level durations (DB vs API vs cache) |
| Why a request failed | Error status + recorded exceptions |
| Concurrency issues | Overlapping spans showing contention |
| Cross-service flow | Parent/child relationships & context propagation |

Traces + spans give you high-resolution *causal context*. Model them thoughtfully: fewer, higher-quality spans with consistent naming and actionable attributes beat noisy, low-value tracing every time.

---

*Want to visualize these traces instantly? Send them via OTLP to [OneUptime](https://oneuptime.com) and correlate with metrics & logs for full-fidelity observability.*

---

### See Also

- [What are metrics in OpenTelemetry: A Complete Guide](/posts/2025-08-26-what-are-metrics-in-opentelemetry/) — Understand the quantitative side (counts, rates, percentiles) to pair with your tracing data.
- [How to name spans in OpenTelemetry](/posts/2024-11-04-how-to-name-spans-in-opentelemetry/) — Apply consistent naming so traces remain searchable and comparable over time.


