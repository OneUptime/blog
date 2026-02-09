# How to Trace Lab Information System (LIS) Result Routing Across Hospital Systems with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, LIS, Lab Results, Hospital Integration

Description: Trace lab result routing from the Lab Information System through hospital interfaces to clinical systems using OpenTelemetry distributed tracing.

Lab results follow a complex path from the analyzer to the clinician. The Lab Information System (LIS) receives results from instruments, validates them, applies reference ranges, and then routes them to multiple destinations: the EHR, the patient portal, the ordering physician's inbox, and potentially a critical value alerting system. When a result does not arrive where it should, finding the point of failure across all these routing paths is extremely difficult without distributed tracing.

This post shows how to trace the full lab result routing flow using OpenTelemetry, from the moment the analyzer produces a result to the final delivery confirmation from each destination.

## Lab Result Flow Architecture

A typical lab result routing flow looks like this: Instrument produces result, LIS receives and validates it, LIS applies rules (reference ranges, delta checks, critical value checks), then the LIS routes to multiple destinations simultaneously. Each destination acknowledgment needs to be tracked independently.

## Instrumenting Result Ingestion from Analyzers

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

# Initialize tracing
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("lis-router", "1.0.0")

# Initialize metrics
metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
metrics.set_meter_provider(MeterProvider(metric_readers=[metric_reader]))
meter = metrics.get_meter("lis-router", "1.0.0")

result_routing_latency = meter.create_histogram(
    "lis.result.routing_latency_ms",
    description="Time to route a result from LIS to destination",
    unit="ms",
)

results_routed = meter.create_counter(
    "lis.results_routed_total",
    description="Total lab results routed to destinations",
)

routing_failures = meter.create_counter(
    "lis.routing_failures_total",
    description="Total routing failures by destination",
)


def receive_result_from_analyzer(raw_result):
    """
    Entry point when a lab analyzer sends a result to the LIS.
    This starts the trace that will follow the result through all routing steps.
    """
    with tracer.start_as_current_span("lis.result.received") as span:
        # Parse the analyzer output (could be ASTM, HL7, or proprietary)
        parsed = parse_analyzer_result(raw_result)

        span.set_attribute("lis.analyzer_id", parsed["analyzer_id"])
        span.set_attribute("lis.test_code", parsed["test_code"])
        span.set_attribute("lis.specimen_id", parsed["specimen_id"])
        span.set_attribute("lis.protocol", parsed.get("protocol", "astm"))

        # Record the time between analyzer producing the result and LIS receiving it
        analyzer_timestamp = parsed.get("result_timestamp", 0)
        if analyzer_timestamp:
            transport_delay = (time.time() - analyzer_timestamp) * 1000
            span.set_attribute("lis.analyzer_transport_delay_ms", transport_delay)

        # Validate the result
        validated_result = validate_result(parsed)

        # Apply business rules and route
        if validated_result["status"] == "valid":
            route_result(validated_result)
        else:
            span.add_event("validation_failed", {
                "reason": validated_result.get("rejection_reason", "unknown"),
            })
```

## Validation and Reference Range Application

```python
def validate_result(parsed_result):
    """Validate the result and apply reference ranges."""
    with tracer.start_as_current_span("lis.result.validate") as span:
        test_code = parsed_result["test_code"]
        value = parsed_result["value"]

        span.set_attribute("lis.test_code", test_code)
        span.set_attribute("lis.result_type", parsed_result.get("value_type", "numeric"))

        # Look up reference ranges for this test
        with tracer.start_as_current_span("lis.reference_range.lookup") as rr_span:
            ref_range = lookup_reference_range(test_code)
            rr_span.set_attribute("lis.reference_range.found", ref_range is not None)

        # Delta check - compare with previous result
        with tracer.start_as_current_span("lis.delta_check") as delta_span:
            previous = get_previous_result(parsed_result["specimen_id"], test_code)
            if previous:
                delta = abs(float(value) - float(previous["value"]))
                delta_span.set_attribute("lis.delta_check.delta_value", delta)
                delta_span.set_attribute("lis.delta_check.exceeded_threshold",
                                        delta > get_delta_threshold(test_code))

        # Critical value check
        with tracer.start_as_current_span("lis.critical_check") as crit_span:
            is_critical = check_critical_value(test_code, value, ref_range)
            crit_span.set_attribute("lis.critical_value", is_critical)
            parsed_result["is_critical"] = is_critical

        parsed_result["status"] = "valid"
        parsed_result["reference_range"] = ref_range
        return parsed_result
```

## Multi-Destination Routing

The most important part is the fan-out routing. Each destination gets its own child span so you can track delivery independently:

```python
import concurrent.futures

def route_result(validated_result):
    """Route the validated result to all configured destinations."""
    with tracer.start_as_current_span("lis.result.route") as span:
        test_code = validated_result["test_code"]
        is_critical = validated_result.get("is_critical", False)

        # Determine destinations based on routing rules
        destinations = get_routing_destinations(test_code)

        # Always route to EHR
        destinations.append("ehr")

        # Critical results also go to the alerting system
        if is_critical:
            destinations.append("critical_alert_system")
            destinations.append("physician_pager")

        span.set_attribute("lis.routing.destination_count", len(destinations))
        span.set_attribute("lis.routing.destinations", destinations)

        # Route to each destination and track results
        routing_results = {}
        with concurrent.futures.ThreadPoolExecutor(max_workers=5) as executor:
            future_to_dest = {}
            for dest in destinations:
                future = executor.submit(send_to_destination, validated_result, dest)
                future_to_dest[future] = dest

            for future in concurrent.futures.as_completed(future_to_dest):
                dest = future_to_dest[future]
                try:
                    result = future.result(timeout=30)
                    routing_results[dest] = result
                except Exception as e:
                    routing_results[dest] = {"status": "error", "error": str(e)}

        # Record routing outcomes
        for dest, result in routing_results.items():
            if result.get("status") == "error":
                routing_failures.add(1, {"destination": dest, "test_code": test_code})

        return routing_results


def send_to_destination(result, destination):
    """Send a result to a specific destination with tracing."""
    start = time.time()

    with tracer.start_as_current_span(f"lis.route.{destination}") as span:
        span.set_attribute("lis.routing.destination", destination)
        span.set_attribute("lis.test_code", result["test_code"])
        span.set_attribute("lis.is_critical", result.get("is_critical", False))

        try:
            if destination == "ehr":
                response = send_to_ehr(result)
            elif destination == "critical_alert_system":
                response = send_critical_alert(result)
            elif destination == "physician_pager":
                response = page_physician(result)
            elif destination == "patient_portal":
                response = send_to_patient_portal(result)
            else:
                response = send_generic_hl7(result, destination)

            span.set_attribute("lis.routing.status", "delivered")
            span.set_attribute("lis.routing.ack_received", response.get("acked", False))

            duration_ms = (time.time() - start) * 1000
            result_routing_latency.record(duration_ms, {
                "destination": destination,
                "test_code": result["test_code"],
            })
            results_routed.add(1, {"destination": destination})

            return {"status": "delivered", "ack": response.get("acked", False)}

        except Exception as e:
            span.set_status(trace.Status(trace.StatusCode.ERROR, str(e)))
            span.set_attribute("lis.routing.status", "failed")
            span.set_attribute("lis.routing.error", str(e))
            raise
```

## Tracking Critical Value Notification Compliance

Hospitals have regulatory requirements for how quickly critical lab values must be communicated to clinicians. Trace this specifically:

```python
def send_critical_alert(result):
    """Send a critical value alert and track the notification timeline."""
    with tracer.start_as_current_span("lis.critical_alert.send") as span:
        span.set_attribute("lis.critical_alert.test_code", result["test_code"])

        # Record when the result was first produced vs. when alert is being sent
        result_time = result.get("result_timestamp", time.time())
        alert_delay_seconds = time.time() - result_time
        span.set_attribute("lis.critical_alert.delay_seconds", alert_delay_seconds)

        # Most hospitals require critical value notification within 30 minutes
        if alert_delay_seconds > 1800:
            span.add_event("critical_alert_sla_breach", {
                "delay_seconds": alert_delay_seconds,
                "sla_seconds": 1800,
            })

        response = alerting_service.send_alert({
            "type": "critical_lab_value",
            "test_code": result["test_code"],
            "priority": "urgent",
        })

        span.set_attribute("lis.critical_alert.delivered", response["delivered"])
        return response
```

## Summary

Tracing lab result routing with OpenTelemetry lets you see exactly where every result goes and how long each delivery takes. The multi-destination fan-out pattern is what makes this challenging without distributed tracing since a single result might succeed at the EHR but fail at the patient portal, and you need visibility into both. Focus your monitoring on end-to-end routing latency per destination, critical value notification timelines, and routing failure rates. These are the metrics that keep lab operations running smoothly and keep hospitals in compliance with critical value reporting requirements.
