# How to Trace IMS (IP Multimedia Subsystem) Session Flows with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, IMS, VoLTE, Distributed Tracing, Telecommunications

Description: Trace IMS session flows across P-CSCF, I-CSCF, and S-CSCF components using OpenTelemetry distributed tracing for VoLTE.

The IP Multimedia Subsystem (IMS) is the backbone of voice and video services in LTE and 5G networks. When a VoLTE call fails or experiences poor quality, the problem could be in any of the CSCF (Call Session Control Function) nodes, the HSS, or the media gateway. Distributed tracing with OpenTelemetry gives you visibility into the full session flow so you can identify bottlenecks and failures fast.

## IMS Architecture Quick Overview

An IMS session traverses multiple components:

- **P-CSCF (Proxy)**: Entry point, handles SIP compression and IPsec
- **I-CSCF (Interrogating)**: Queries HSS for user location, routes to the right S-CSCF
- **S-CSCF (Serving)**: Core session control, applies service logic, interacts with application servers
- **HSS**: Home Subscriber Server, stores user profiles
- **MGCF/MGW**: Media Gateway for PSTN interworking
- **AS (Application Servers)**: Supplementary services like voicemail, conferencing

## Implementing Trace Context Propagation in IMS

Since IMS uses SIP signaling, we need to propagate OpenTelemetry trace context through SIP headers. We will use a custom header approach that works with existing IMS infrastructure.

```python
# ims_tracing.py
from opentelemetry import trace, context
from opentelemetry.propagators.textmap import TextMapPropagator
from opentelemetry import propagate
import re

tracer = trace.get_tracer("ims.session")

# Custom SIP header for trace propagation within the IMS core
TRACE_PARENT_HEADER = "P-OTel-Traceparent"
TRACE_STATE_HEADER = "P-OTel-Tracestate"


class IMSSIPPropagator(TextMapPropagator):
    """Propagator that uses IMS-friendly SIP private headers."""

    def inject(self, carrier, context=None, setter=None):
        span = trace.get_current_span(context)
        if not span.get_span_context().is_valid:
            return

        sc = span.get_span_context()
        # Format as W3C traceparent
        traceparent = f"00-{format(sc.trace_id, '032x')}-{format(sc.span_id, '016x')}-{format(sc.trace_flags, '02x')}"
        if setter:
            setter.set(carrier, TRACE_PARENT_HEADER, traceparent)
        else:
            carrier[TRACE_PARENT_HEADER] = traceparent

    def extract(self, carrier, context=None, getter=None):
        if getter:
            traceparent = getter.get(carrier, TRACE_PARENT_HEADER)
        else:
            traceparent = carrier.get(TRACE_PARENT_HEADER)

        if not traceparent:
            return context or context.get_current()

        # Parse the traceparent value
        if isinstance(traceparent, list):
            traceparent = traceparent[0]

        match = re.match(
            r"^00-([0-9a-f]{32})-([0-9a-f]{16})-([0-9a-f]{2})$",
            traceparent
        )
        if not match:
            return context or context.get_current()

        trace_id = int(match.group(1), 16)
        span_id = int(match.group(2), 16)
        trace_flags = int(match.group(3), 16)

        span_context = trace.SpanContext(
            trace_id=trace_id,
            span_id=span_id,
            is_remote=True,
            trace_flags=trace.TraceFlags(trace_flags),
        )

        return trace.set_span_in_context(
            trace.NonRecordingSpan(span_context),
            context or context.get_current()
        )

    @property
    def fields(self):
        return {TRACE_PARENT_HEADER, TRACE_STATE_HEADER}
```

## Instrumenting the P-CSCF

The P-CSCF is where the session enters the IMS core. This is where we create the root span.

```python
# pcscf_handler.py
from opentelemetry import trace
from opentelemetry.trace import StatusCode

tracer = trace.get_tracer("ims.pcscf")


def handle_register(sip_request):
    """Handle an IMS REGISTER request at the P-CSCF."""
    with tracer.start_as_current_span("ims.pcscf.register") as span:
        impu = sip_request.get_header("P-Preferred-Identity") or sip_request.from_uri
        span.set_attributes({
            "ims.impu": impu,
            "ims.method": "REGISTER",
            "ims.pcscf.instance": get_instance_id(),
            "sip.call_id": sip_request.call_id,
            "ims.access_type": determine_access_type(sip_request),
        })

        # Perform IPsec security association setup
        with tracer.start_as_current_span("ims.pcscf.ipsec_setup") as ipsec_span:
            sa_result = setup_ipsec_sa(sip_request)
            ipsec_span.set_attribute("ims.ipsec.spi", sa_result.spi)
            if not sa_result.success:
                ipsec_span.set_status(StatusCode.ERROR, "IPsec SA setup failed")
                return create_response(403)

        # Forward to I-CSCF with trace context in SIP header
        inject_trace_context(sip_request)
        response = forward_to_icscf(sip_request)

        span.set_attribute("ims.response_code", response.status_code)
        return response


def handle_invite(sip_request):
    """Handle an IMS INVITE for a VoLTE/VoNR call."""
    with tracer.start_as_current_span("ims.pcscf.invite") as span:
        span.set_attributes({
            "ims.calling_party": sip_request.from_uri,
            "ims.called_party": sip_request.to_uri,
            "ims.method": "INVITE",
            "sip.call_id": sip_request.call_id,
            "ims.sdp.codec": extract_codec(sip_request),
            "ims.sdp.bandwidth": extract_bandwidth(sip_request),
        })

        # Check preconditions and apply policy via Rx interface to PCRF/PCF
        with tracer.start_as_current_span("ims.pcscf.rx_aar") as rx_span:
            aar_result = send_rx_aar(sip_request)
            rx_span.set_attribute("ims.rx.result_code", aar_result.result_code)
            rx_span.set_attribute("ims.rx.session_id", aar_result.session_id)

        inject_trace_context(sip_request)
        response = forward_to_scscf(sip_request)

        span.set_attribute("ims.response_code", response.status_code)
        return response
```

## Instrumenting the S-CSCF

```python
# scscf_handler.py
tracer = trace.get_tracer("ims.scscf")


def handle_invite(sip_request):
    """Process INVITE at the S-CSCF."""
    # Extract trace context from incoming SIP
    ctx = extract_trace_context(sip_request)

    with tracer.start_as_current_span("ims.scscf.invite", context=ctx) as span:
        span.set_attributes({
            "ims.method": "INVITE",
            "sip.call_id": sip_request.call_id,
            "ims.scscf.instance": get_instance_id(),
        })

        # Query HSS for called party profile
        with tracer.start_as_current_span("ims.scscf.hss_query") as hss_span:
            profile = query_hss(sip_request.to_uri)
            hss_span.set_attribute("ims.hss.response_time_ms", profile.response_time)
            hss_span.set_attribute("ims.hss.ifc_count", len(profile.ifcs))

        # Evaluate initial filter criteria (iFC)
        # This determines which Application Servers to invoke
        with tracer.start_as_current_span("ims.scscf.ifc_eval") as ifc_span:
            matching_as_list = evaluate_ifc(profile.ifcs, sip_request)
            ifc_span.set_attribute("ims.ifc.matching_count", len(matching_as_list))

            # Route through each matching Application Server
            for as_config in matching_as_list:
                with tracer.start_as_current_span("ims.scscf.as_invoke") as as_span:
                    as_span.set_attribute("ims.as.uri", as_config.server_uri)
                    as_span.set_attribute("ims.as.service", as_config.service_name)
                    inject_trace_context(sip_request)
                    as_response = forward_to_as(sip_request, as_config)
                    as_span.set_attribute("ims.as.response", as_response.status_code)

        # Forward to terminating side
        inject_trace_context(sip_request)
        return route_to_terminating(sip_request)
```

## Key IMS Metrics to Collect

Along with traces, collect these IMS-specific metrics:

- `ims.registration.latency` - Time for full IMS registration
- `ims.session.setup_time` - INVITE to 200 OK
- `ims.hss.query_latency` - HSS Cx/Dx interface response time
- `ims.as.invocation_latency` - Application server processing time
- `ims.rx.aar_latency` - Policy interaction time via Rx interface
- `ims.session.active_count` - Concurrent active sessions per S-CSCF

With this tracing in place, when a VoLTE call takes too long to connect, you can open the trace and immediately see whether the delay was in HSS lookup, application server processing, or the terminating network. That level of detail transforms IMS troubleshooting from guesswork into data-driven analysis.
