# Traces vs Metrics in Software Observability

Author: [devneelpatel](https://www.github.com/devneelpatel)

Tags: Observability, OpenTelemetry, Metrics, Traces, Logs, Open Source

Description: Metrics tell you what changed. Traces tell you where. Logs tell you why. Here’s how to design each signal intentionally with OpenTelemetry (and avoid wasting money or time).

---

> Metrics shout “Something drifted.”  
> Traces answer “Here — inside this span boundary.”  
> Logs explain “Because this exact code path / parameter / error.”

Most teams intellectually “know” the three pillars, yet still misuse them: metrics overloaded with dimensions, traces turned into verbose call graphs, logs sprayed unstructured everywhere. The result: spend grows, clarity shrinks.

This post reframes Traces vs Metrics *inside* the OpenTelemetry mental model so you design a **correlated narrative** instead of three disconnected exhaust streams.

---

## 1. Pick the Question First

| Question | Use |
|----------|-----|
| SLO burn? Latency spike? Error rate up? | Metric |
| Where is the request stalled / failing? | Trace |
| What exact param / exception / branch? | Log (linked) |

---

## What are Metrics? 

Metrics are **aggregated signals** that answer “WHAT changed?” They summarize system behavior over time, like:
- Request counts
- Latency percentiles
- Error rates

Metrics are **not** about individual requests or spans. They are **aggregated** over time, often with dimensions like:
- Service name
- Endpoint
- HTTP method

Here are some common metrics you might collect:

| Metric | Type | Unit | Description |
|--------|------|------|-------------|
| http_request_duration_seconds | histogram | seconds | Duration of HTTP requests in seconds |
| http_request_count | counter | requests | Total number of HTTP requests |


## What are Traces?

Traces are **detailed execution paths** that answer “WHERE did it happen?” They show the flow of a request through your system, including:
- Service boundaries
- Latency breakdowns
- Error propagation     

Traces are **not** about aggregated metrics or high-level summaries. They are **detailed** and **contextual**, showing the exact path a request took through your system.

For example, a trace might show (single trace id with a root span and children):

```mermaid
gantt
    title Trace Timeline: HTTP POST /checkout
| 1234abcd  | a1b2c3d4  | root0001       | auth-service    | authenticate            | 180ms    | 12:00:00.010   | 12:00:00.190   | OK     | user_id=42 |
| 1234abcd  | q7r8s9t0  | root0001       | payment-service | process-payment         | 520ms    | 12:00:00.200   | 12:00:00.720   | OK     | retries=1 (child ops sampled) |
| 1234abcd  | pspErr01  | q7r8s9t0       | payment-service | POST /psp/charge        | 310ms    | 12:00:00.210   | 12:00:00.520   | ERROR  | timeout retry=1 |
| 1234abcd  | psp22222  | q7r8s9t0       | payment-service | POST /psp/charge        | 160ms    | 12:00:00.540   | 12:00:00.700   | OK     | amount=42.00 USD |
| 1234abcd  | u1v2w3x4  | root0001       | order-service   | create-order            | 180ms    | 12:00:00.730   | 12:00:00.910   | OK     | order_id=987654 |
```

[Traces](./trace.svg)

Notes:
- Parent Span ID links tree structure (root span has none).
- Error span (pspErr01) shows failed external call; succeeding attempt follows.
- Mixed parallel (auth, cart, inventory, pricing) and nested spans (DB + external calls) illustrate depth.
- Correlate IDs to attach logs (e.g., payment retry reason) without bloating metrics. 



## What are Logs?

Logs are **unstructured text records** that answer “WHY did it happen?” They provide detailed context about specific events, like:
- Error messages
- Debugging information
- System state at a point in time

Logs are **not** about aggregated metrics or high-level summaries. They are **detailed** and **contextual**, showing the exact state of your system at a specific point in time.

For example, a log entry might look like:

```json
{
  "timestamp": "2025-08-21T12:00:00.210Z",
  "level": "ERROR",
  "message": "Payment service timeout",
  "span_id": "pspErr01",
  "trace_id": "1234abcd",
  "service": "payment-service",
  "details": {
    "retry_count": 1,
    "http_method": "POST",
    "endpoint": "/psp/charge",
    "amount": "42.00 USD"
  }
}
```

Plese note logs are often linked to traces via `trace_id` and `span_id`, allowing you to correlate detailed logs with specific spans in your trace.


---
## Final Take

> Metrics = WHAT changed. Traces = WHERE it happened. Logs = WHY. Design for questions, correlate for speed, sample for value density. 

OpenTelemetry gives the neutral contract; OneUptime unifies the view. Pay for insight—not guesswork.

