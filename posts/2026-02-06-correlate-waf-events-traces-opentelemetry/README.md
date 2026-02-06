# How to Correlate WAF Events with Application Traces Using the OpenTelemetry Collector Syslog Receiver

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, WAF, Syslog Receiver, Security Correlation

Description: Correlate WAF events with application traces using the OpenTelemetry Collector syslog receiver to bridge network and application security data.

Your WAF (Web Application Firewall) blocks malicious traffic at the network edge, but it operates blind to your application context. When a WAF rule triggers, you know a request was blocked, but not which user was affected or what the application would have done. By ingesting WAF syslog events into the OpenTelemetry Collector and correlating them with application traces, you bridge this gap.

## The Correlation Problem

WAF events contain network-level data: source IP, request URI, matched rule, and action taken. Application traces contain application-level data: user ID, tenant, business operation, and downstream calls. Connecting these two datasets lets you answer questions like "How many of our legitimate users are being blocked by WAF rules?" and "Which WAF rule is generating the most false positives for our API?"

## Setting Up the Syslog Receiver

Configure the OpenTelemetry Collector to receive syslog messages from your WAF:

```yaml
# otel-collector-waf.yaml
receivers:
  # Receive WAF logs via syslog
  syslog:
    udp:
      listen_address: "0.0.0.0:54526"
    protocol: rfc5424
    operators:
      # Parse WAF-specific fields from the syslog message
      - type: regex_parser
        regex: 'waf_rule_id=(?P<waf_rule_id>[^ ]+) action=(?P<waf_action>[^ ]+) src_ip=(?P<src_ip>[^ ]+) uri=(?P<request_uri>[^ ]+) method=(?P<http_method>[^ ]+)'
        on_error: drop

  # Also receive application traces via OTLP
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Enrich WAF logs with structured attributes
  attributes/waf:
    actions:
      - key: security.source
        value: "waf"
        action: insert
      - key: event.category
        value: "network_security"
        action: insert

  # Group WAF events and traces by source IP for correlation
  groupbyattrs:
    keys:
      - src_ip
      - security.source_ip

  batch:
    send_batch_size: 256
    timeout: 5s

exporters:
  otlp/backend:
    endpoint: observability-backend:4317

  # Send correlated data to security backend
  otlp/security:
    endpoint: security-backend:4317

service:
  pipelines:
    logs/waf:
      receivers: [syslog]
      processors: [attributes/waf, batch]
      exporters: [otlp/backend, otlp/security]

    traces/app:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/backend]
```

## Application-Side Instrumentation

On the application side, ensure your traces carry the source IP so the correlation can happen:

```python
# waf_correlation.py
from opentelemetry import trace, metrics
from fastapi import Request

tracer = trace.get_tracer("security.waf_correlation")
meter = metrics.get_meter("security.waf")

waf_blocks_correlated = meter.create_counter(
    "security.waf.blocks_correlated",
    description="WAF blocks that were correlated with application context",
    unit="1",
)

waf_false_positives = meter.create_counter(
    "security.waf.false_positives",
    description="WAF blocks identified as false positives",
    unit="1",
)

async def request_middleware(request: Request, call_next):
    """Add WAF-relevant attributes to every request span."""
    with tracer.start_as_current_span(
        "http.request",
        attributes={
            "security.source_ip": request.client.host,
            "http.url": str(request.url),
            "http.method": request.method,
            "http.user_agent": request.headers.get("user-agent", ""),
        }
    ) as span:
        # Check if WAF headers are present (some WAFs add headers)
        waf_rule_id = request.headers.get("X-WAF-Rule-Id")
        waf_action = request.headers.get("X-WAF-Action")

        if waf_rule_id:
            span.set_attribute("waf.rule_id", waf_rule_id)
            span.set_attribute("waf.action", waf_action or "unknown")

        # Add user context for correlation
        if hasattr(request.state, "user_id"):
            span.set_attribute("user.id", request.state.user_id)
            span.set_attribute("tenant.id", request.state.tenant_id)

        response = await call_next(request)
        span.set_attribute("http.status_code", response.status_code)

        return response
```

## Building the Correlation Service

This service matches WAF events with application traces using shared attributes like source IP and request URI:

```python
# waf_correlator.py
from dataclasses import dataclass
from typing import Optional

@dataclass
class WAFEvent:
    timestamp: float
    rule_id: str
    action: str
    source_ip: str
    request_uri: str
    http_method: str

@dataclass
class CorrelatedEvent:
    waf_event: WAFEvent
    trace_id: Optional[str]
    user_id: Optional[str]
    tenant_id: Optional[str]
    is_false_positive: bool

class WAFTraceCorrelator:
    def __init__(self, trace_store):
        self.trace_store = trace_store

    async def correlate(self, waf_event: WAFEvent) -> CorrelatedEvent:
        """Find application traces that match a WAF event."""
        with tracer.start_as_current_span(
            "waf.correlate",
            attributes={
                "waf.rule_id": waf_event.rule_id,
                "waf.source_ip": waf_event.source_ip,
                "waf.request_uri": waf_event.request_uri,
            }
        ) as span:
            # Look for traces from the same IP around the same time
            matching_traces = await self.trace_store.find_traces(
                source_ip=waf_event.source_ip,
                time_range=(waf_event.timestamp - 5, waf_event.timestamp + 5),
                uri_pattern=waf_event.request_uri,
            )

            if matching_traces:
                trace_data = matching_traces[0]
                # Check if this was a legitimate user
                is_known_user = trace_data.get("user_id") is not None

                correlated = CorrelatedEvent(
                    waf_event=waf_event,
                    trace_id=trace_data.get("trace_id"),
                    user_id=trace_data.get("user_id"),
                    tenant_id=trace_data.get("tenant_id"),
                    is_false_positive=is_known_user and waf_event.action == "block",
                )

                waf_blocks_correlated.add(1, {
                    "waf.rule_id": waf_event.rule_id,
                    "waf.has_user_context": str(is_known_user),
                })

                if correlated.is_false_positive:
                    waf_false_positives.add(1, {
                        "waf.rule_id": waf_event.rule_id,
                    })
                    span.add_event("potential_false_positive", {
                        "waf.rule_id": waf_event.rule_id,
                        "user.id": trace_data.get("user_id", ""),
                    })

                return correlated

            return CorrelatedEvent(
                waf_event=waf_event,
                trace_id=None,
                user_id=None,
                tenant_id=None,
                is_false_positive=False,
            )
```

## Tuning WAF Rules with Telemetry Data

The real payoff of WAF-trace correlation is data-driven rule tuning. When you can see that Rule X is blocking 15 legitimate users per day while catching 2 actual attacks, you have the evidence to adjust the rule's sensitivity. Without application-level correlation, you would only see aggregate block counts and have to guess whether they are false positives.

Build a dashboard that shows each WAF rule's block count, the percentage of blocks that correlate with known users, and the false positive rate. This turns WAF management from guesswork into an evidence-based process.
