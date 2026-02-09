# How to Trace VoIP Call Setup and Teardown (SIP Signaling) Latency with OpenTelemetry Custom Spans

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, VoIP, SIP, Distributed Tracing, Telecommunications

Description: A practical guide to tracing VoIP call setup and teardown using SIP signaling with OpenTelemetry custom spans for latency analysis.

VoIP call quality depends heavily on the speed and reliability of SIP signaling. A slow INVITE transaction or a failed BYE can ruin the user experience. In this post, we will instrument SIP signaling flows with OpenTelemetry custom spans so you can pinpoint exactly where latency creeps in during call setup and teardown.

## SIP Call Flow Basics

A typical SIP call involves these signaling steps:

1. **INVITE** - Caller initiates the session
2. **100 Trying** - Proxy acknowledges
3. **180 Ringing** - Callee device is ringing
4. **200 OK** - Callee answers
5. **ACK** - Caller confirms media session
6. **BYE** - Either party ends the call
7. **200 OK** - Confirmation of teardown

Each of these transitions is a good candidate for a span boundary.

## Instrumenting the SIP Proxy

Let's instrument a SIP proxy (like Kamailio or OpenSIPS) using OpenTelemetry. We will create a middleware layer that intercepts SIP messages and creates spans.

```python
# sip_otel_middleware.py
from opentelemetry import trace
from opentelemetry.trace import StatusCode
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
import time

# Initialize the tracer
provider = TracerProvider()
exporter = OTLPSpanExporter(endpoint="oneuptime-collector:4317")
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer("sip.proxy")

# Store active call contexts keyed by Call-ID
active_calls = {}


def on_sip_message(sip_msg):
    """Called for every SIP message passing through the proxy."""
    call_id = sip_msg.get_header("Call-ID")
    method = sip_msg.method
    status_code = sip_msg.status_code  # None for requests

    if method == "INVITE" and status_code is None:
        # Start a new root span for the call setup
        ctx = trace.set_span_in_context(trace.INVALID_SPAN)
        span = tracer.start_span(
            "sip.call.setup",
            context=ctx,
            attributes={
                "sip.call_id": call_id,
                "sip.method": "INVITE",
                "sip.from": sip_msg.get_header("From"),
                "sip.to": sip_msg.get_header("To"),
                "sip.via": sip_msg.get_header("Via"),
            }
        )
        active_calls[call_id] = {
            "setup_span": span,
            "setup_ctx": trace.set_span_in_context(span),
            "invite_time": time.time(),
        }

    elif status_code == 180 and call_id in active_calls:
        # Record the ringing event as a span event
        call_ctx = active_calls[call_id]
        call_ctx["setup_span"].add_event("sip.ringing", {
            "sip.status_code": 180,
            "sip.elapsed_ms": (time.time() - call_ctx["invite_time"]) * 1000,
        })

    elif status_code == 200 and call_id in active_calls:
        call_ctx = active_calls[call_id]
        if "teardown_span" in call_ctx:
            # This is the 200 OK for BYE, end the teardown span
            call_ctx["teardown_span"].set_status(StatusCode.OK)
            call_ctx["teardown_span"].end()
            call_ctx["setup_span"].end()
            del active_calls[call_id]
        else:
            # This is the 200 OK for INVITE, record call answered
            elapsed = (time.time() - call_ctx["invite_time"]) * 1000
            call_ctx["setup_span"].set_attribute("sip.setup_time_ms", elapsed)
            call_ctx["setup_span"].add_event("sip.answered", {
                "sip.status_code": 200,
                "sip.setup_time_ms": elapsed,
            })

    elif method == "BYE" and status_code is None and call_id in active_calls:
        # Start a child span for the teardown phase
        call_ctx = active_calls[call_id]
        teardown_span = tracer.start_span(
            "sip.call.teardown",
            context=call_ctx["setup_ctx"],
            attributes={
                "sip.call_id": call_id,
                "sip.method": "BYE",
                "sip.initiated_by": sip_msg.get_header("From"),
            }
        )
        call_ctx["teardown_span"] = teardown_span
        call_ctx["bye_time"] = time.time()
```

## Propagating Trace Context Through SIP Headers

SIP does not natively carry W3C trace context. You need to inject it into a custom SIP header so that downstream proxies and application servers can continue the trace.

```python
# sip_context_propagation.py
from opentelemetry.context import get_current
from opentelemetry.propagators.textmap import CarrierT
from opentelemetry import propagate


class SIPHeaderCarrier(dict):
    """Adapter to use SIP headers as a W3C propagation carrier."""

    def __init__(self, sip_msg):
        self.sip_msg = sip_msg
        super().__init__()

    def __setitem__(self, key, value):
        # Map W3C headers to SIP custom headers
        # Using X- prefix for custom SIP headers
        sip_header = f"X-OTel-{key}"
        self.sip_msg.add_header(sip_header, value)

    def __getitem__(self, key):
        sip_header = f"X-OTel-{key}"
        return self.sip_msg.get_header(sip_header)

    def keys(self):
        return [h.replace("X-OTel-", "")
                for h in self.sip_msg.headers
                if h.startswith("X-OTel-")]


def inject_context_into_sip(sip_msg):
    """Inject current trace context into outgoing SIP message."""
    carrier = SIPHeaderCarrier(sip_msg)
    propagate.inject(carrier)


def extract_context_from_sip(sip_msg):
    """Extract trace context from incoming SIP message."""
    carrier = SIPHeaderCarrier(sip_msg)
    return propagate.extract(carrier)
```

## Custom Metrics for SIP Performance

Beyond tracing, you should collect aggregate metrics that give you a dashboard view of SIP health.

```python
# sip_metrics.py
from opentelemetry import metrics

meter = metrics.get_meter("sip.metrics")

# Histogram for call setup latency (INVITE to 200 OK)
call_setup_latency = meter.create_histogram(
    "sip.call.setup_latency",
    description="Time from INVITE to 200 OK in milliseconds",
    unit="ms",
)

# Counter for SIP response codes
sip_response_counter = meter.create_counter(
    "sip.response.count",
    description="Count of SIP responses by status code",
    unit="{response}",
)

# Gauge for concurrent active calls
active_call_gauge = meter.create_up_down_counter(
    "sip.calls.active",
    description="Number of currently active SIP sessions",
    unit="{call}",
)

# Track failed calls separately for quick alerting
failed_call_counter = meter.create_counter(
    "sip.call.failed",
    description="Count of failed call attempts by reason",
    unit="{call}",
)
```

## What to Alert On

Based on the telemetry data, set up alerts for these conditions:

- **Call setup latency > 3 seconds**: This typically indicates a problem with the registrar, DNS resolution, or downstream proxy.
- **BYE-to-200 OK latency > 1 second**: Slow teardown can cause overbilling and phantom calls.
- **4xx/5xx response rate > 5%**: A spike in error responses usually means a misconfigured trunk or authentication issue.
- **Active calls approaching capacity**: When your concurrent call count approaches your license or hardware limit, you need to scale.

## Putting It Together

With this instrumentation in place, each SIP call gets a full trace showing the timeline from INVITE through BYE. You can see exactly how long each phase took, identify retransmissions (which show up as duplicate spans), and correlate SIP signaling delays with media quality issues. The trace context propagation through custom SIP headers means that even in multi-proxy environments, you get a single end-to-end trace for each call.
