# How to Set Up Blameless Postmortem Workflows Powered by OpenTelemetry Trace Data

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Postmortem, Incident Response, Traces

Description: Use OpenTelemetry trace data to build evidence-based blameless postmortem workflows that focus on systems rather than people.

A blameless postmortem aims to understand what happened during an incident and what systemic changes will prevent recurrence. The quality of a postmortem depends heavily on the evidence available. Vague timelines and incomplete logs lead to vague conclusions. OpenTelemetry traces provide a precise, timestamped record of every request path through your system during an incident - making them an ideal data source for postmortem analysis.

## The Evidence Problem in Postmortems

Most postmortem templates ask for a timeline of events, root cause analysis, and contributing factors. Without good observability data, teams rely on memory, chat logs, and manually correlated timestamps. This leads to incomplete pictures and, worse, tends to focus blame on whoever made the last change rather than on the systemic conditions that allowed the failure.

OpenTelemetry traces solve this by providing:

- Exact timestamps for every service interaction
- Error propagation paths showing which service failed first
- Latency breakdowns showing where time was spent
- Attribute data showing request parameters, versions, and infrastructure details

## Capturing Incident Traces

The first step is ensuring you have trace data from the incident window. If you use tail-based sampling, configure it to retain all traces that contain errors or exceed latency thresholds.

```yaml
# otel-collector-config.yaml
processors:
  # Tail-based sampling retains interesting traces
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    policies:
      # Always keep traces with errors
      - name: error-traces
        type: status_code
        status_code:
          status_codes: [ERROR]
      # Always keep slow traces
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 1000
      # Sample 10% of normal traces for baseline comparison
      - name: normal-baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

exporters:
  otlp:
    endpoint: "tracing-backend:4317"
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling]
      exporters: [otlp]
```

## Extracting Timeline Data from Traces

During a postmortem, the first thing you need is a timeline. OpenTelemetry traces contain all the data needed to construct one. Here is a Python script that queries your trace backend and builds an incident timeline.

```python
import requests
from datetime import datetime, timedelta
from collections import defaultdict

def build_incident_timeline(
    trace_api_url: str,
    service: str,
    start_time: datetime,
    end_time: datetime,
) -> list[dict]:
    """
    Query the tracing backend for error traces during the incident window
    and construct a timeline of events.
    """
    # Query parameters for the trace search API
    params = {
        "service": service,
        "start": int(start_time.timestamp() * 1_000_000),  # microseconds
        "end": int(end_time.timestamp() * 1_000_000),
        "tags": '{"error":"true"}',
        "limit": 500,
    }

    response = requests.get(f"{trace_api_url}/api/traces", params=params)
    traces = response.json()["data"]

    timeline = []
    for trace in traces:
        for span in trace["spans"]:
            if span.get("tags", {}).get("error") == "true":
                timeline.append({
                    "timestamp": datetime.fromtimestamp(span["startTime"] / 1_000_000),
                    "service": span["process"]["serviceName"],
                    "operation": span["operationName"],
                    "error_type": span.get("tags", {}).get("error.type", "unknown"),
                    "error_message": get_error_message(span),
                    "trace_id": trace["traceID"],
                    "duration_ms": span["duration"] / 1000,
                })

    # Sort by timestamp to create a chronological timeline
    timeline.sort(key=lambda x: x["timestamp"])
    return timeline


def get_error_message(span: dict) -> str:
    """Extract the error message from span logs/events."""
    for log in span.get("logs", []):
        for field in log.get("fields", []):
            if field["key"] == "message":
                return field["value"]
    return "No error message recorded"
```

## Structured Postmortem Template with Trace References

A postmortem template that incorporates trace data looks different from a traditional one. Each section references specific trace IDs and spans.

```yaml
# postmortem-template.yaml
incident:
  id: "INC-2026-0142"
  title: "Payment processing failures for 23 minutes"
  severity: "SEV-1"
  duration_minutes: 23
  services_affected:
    - payment-service
    - checkout-service
    - order-service

timeline:
  # Each entry links to a specific trace for evidence
  - time: "2026-02-05T14:32:00Z"
    event: "First error span detected in payment-service"
    trace_id: "abc123def456"
    evidence: "Connection timeout to payment gateway (span: payment-gateway-call)"

  - time: "2026-02-05T14:33:15Z"
    event: "Error rate exceeded 5% in payment-service"
    evidence: "Burn rate alert SLOBurnRateCritical fired"

  - time: "2026-02-05T14:34:00Z"
    event: "Errors propagated to checkout-service"
    trace_id: "def456ghi789"
    evidence: "checkout-service spans show upstream payment failures"

  - time: "2026-02-05T14:55:00Z"
    event: "Payment gateway connectivity restored"
    trace_id: "jkl012mno345"
    evidence: "First successful payment span after incident"

root_cause:
  description: "Payment gateway connection pool exhaustion"
  origin_service: "payment-service"
  origin_span: "payment-gateway-call"
  contributing_factors:
    - "Connection pool max size was 10, insufficient for traffic spike"
    - "No circuit breaker on payment gateway calls"
    - "Retry logic amplified connection pressure"

action_items:
  - action: "Increase connection pool to 50 with proper timeout"
    owner: "payment-team"
    priority: "P1"
  - action: "Add circuit breaker with OpenTelemetry span events for state changes"
    owner: "payment-team"
    priority: "P1"
  - action: "Add connection pool utilization metric via OpenTelemetry"
    owner: "platform-team"
    priority: "P2"
```

## Enriching Traces for Better Postmortems

The value of traces in postmortems depends on the attributes attached to spans. Add context that will be useful during analysis.

```python
from opentelemetry import trace

tracer = trace.get_tracer("payment-service")

def process_payment(order_id: str, amount: float):
    with tracer.start_as_current_span("process-payment") as span:
        # Add attributes valuable during incident analysis
        span.set_attribute("order.id", order_id)
        span.set_attribute("payment.amount", amount)
        span.set_attribute("deployment.version", "v2.3.1")

        try:
            result = call_payment_gateway(amount)
            return result
        except TimeoutError as e:
            span.set_status(trace.StatusCode.ERROR, str(e))
            span.record_exception(e)
            span.set_attribute("payment.gateway.pool.active", get_pool_active_count())
            raise
```

## Automating Evidence Collection

Rather than manually querying traces during a postmortem, automate the evidence collection. When an incident is declared, trigger a job that pulls relevant traces and pre-processes them into the timeline format. This ensures evidence is captured before trace retention policies delete the data.

The combination of blameless process and rich trace data shifts postmortems from "who did this" to "what conditions in our system allowed this." That shift is what makes postmortems genuinely productive.
