# How to Monitor Airport Flight Information Display System (FIDS) Data Pipeline with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Airport FIDS, Data Pipeline, Aviation

Description: Monitor airport flight information display system data pipelines using OpenTelemetry to ensure accurate real-time flight data.

Airport Flight Information Display Systems (FIDS) show real-time departure and arrival information to passengers throughout the terminal. The data pipeline behind FIDS aggregates information from multiple sources, including airline operational systems, air traffic control, gate management, and baggage handling. Any delay or error in this pipeline means passengers see outdated information, leading to confusion and missed connections. This post covers how to instrument the FIDS data pipeline with OpenTelemetry.

## FIDS Data Pipeline Architecture

A typical FIDS pipeline:

1. Ingests flight data from airline hosts (multiple airlines per airport)
2. Receives gate assignment updates from the gate management system
3. Gets delay and cancellation updates from air traffic management
4. Merges data from all sources into a unified flight record
5. Applies display logic (which flights to show on which screens)
6. Pushes updates to display hardware across the terminal

Data freshness is critical. Passengers expect FIDS to reflect changes within 30 seconds.

## Instrumenting Data Ingestion

```python
from opentelemetry import trace, metrics
from opentelemetry.trace import SpanKind
import time

tracer = trace.get_tracer("fids.pipeline")
meter = metrics.get_meter("fids.pipeline")

ingestion_latency = meter.create_histogram(
    "fids.ingestion_latency_ms",
    description="Time to ingest and process a flight update from a source",
    unit="ms",
)

updates_received = meter.create_counter(
    "fids.updates_received_total",
    description="Total flight updates received by source",
)

stale_data_alerts = meter.create_counter(
    "fids.stale_data_alerts_total",
    description="Number of times a data source exceeded the freshness threshold",
)

def ingest_flight_update(source, message):
    """Process an incoming flight update from an airline or ATC source."""
    with tracer.start_as_current_span(
        "fids.ingest_update",
        kind=SpanKind.CONSUMER,
        attributes={
            "fids.source": source.name,
            "fids.source_type": source.type,  # 'airline_host', 'atc', 'gate_mgmt'
            "fids.message_type": message.type,
        }
    ) as span:
        start = time.time()

        # Parse the message (different formats per source)
        with tracer.start_as_current_span(
            "fids.parse_message",
            attributes={"fids.message_format": source.message_format}
        ) as parse_span:
            parsed = parse_flight_message(source, message)
            parse_span.set_attribute("fids.flight_number", parsed.flight_number)
            parse_span.set_attribute("fids.update_type", parsed.update_type)

            if parsed.update_type == "delay":
                parse_span.set_attribute("fids.new_time", str(parsed.new_time))
                parse_span.set_attribute("fids.delay_minutes", parsed.delay_minutes)
            elif parsed.update_type == "gate_change":
                parse_span.set_attribute("fids.old_gate", parsed.old_gate)
                parse_span.set_attribute("fids.new_gate", parsed.new_gate)
            elif parsed.update_type == "cancellation":
                parse_span.set_attribute("fids.cancellation_reason", parsed.reason)

        # Validate the update
        with tracer.start_as_current_span("fids.validate_update") as val_span:
            validation = validate_flight_update(parsed)
            val_span.set_attribute("fids.validation_passed", validation.passed)
            if not validation.passed:
                val_span.set_attribute("fids.validation_error", validation.error)
                return

        # Merge into the unified flight record
        with tracer.start_as_current_span("fids.merge_update") as merge_span:
            merge_result = merge_flight_update(parsed)
            merge_span.set_attribute("fids.fields_updated", str(merge_result.updated_fields))
            merge_span.set_attribute("fids.conflict_resolved", merge_result.had_conflict)

        # Check data freshness
        message_age_ms = (time.time() - message.timestamp) * 1000
        span.set_attribute("fids.message_age_ms", message_age_ms)

        if message_age_ms > 30000:  # Older than 30 seconds
            stale_data_alerts.add(1, {"fids.source": source.name})
            span.addEvent("stale_data_warning", {
                "fids.message_age_ms": message_age_ms,
            })

        latency = (time.time() - start) * 1000
        ingestion_latency.record(latency, {
            "fids.source": source.name,
            "fids.update_type": parsed.update_type,
        })

        updates_received.add(1, {
            "fids.source": source.name,
            "fids.update_type": parsed.update_type,
        })
```

## Monitoring Display Updates

Once the data is merged, it needs to reach the physical displays:

```python
display_update_latency = meter.create_histogram(
    "fids.display_update_latency_ms",
    description="Time from data merge to display update",
    unit="ms",
)

display_errors = meter.create_counter(
    "fids.display_errors_total",
    description="Number of display update failures",
)

def push_to_displays(flight_record, affected_displays):
    """Push updated flight information to terminal displays."""
    with tracer.start_as_current_span(
        "fids.push_to_displays",
        attributes={
            "fids.flight_number": flight_record.flight_number,
            "fids.display_count": len(affected_displays),
        }
    ) as span:
        results = {"success": 0, "failed": 0}

        for display in affected_displays:
            with tracer.start_as_current_span(
                "fids.update_display",
                attributes={
                    "fids.display_id": display.id,
                    "fids.display_location": display.location,
                    "fids.display_type": display.type,  # 'departure_board', 'gate_display', 'baggage'
                }
            ) as display_span:
                try:
                    send_display_update(display, flight_record)
                    display_span.set_attribute("fids.update_success", True)
                    results["success"] += 1
                except Exception as e:
                    display_span.set_status(trace.StatusCode.ERROR, str(e))
                    display_span.set_attribute("fids.update_success", False)
                    display_errors.add(1, {
                        "fids.display_id": display.id,
                        "fids.display_type": display.type,
                    })
                    results["failed"] += 1

        span.set_attribute("fids.displays_updated", results["success"])
        span.set_attribute("fids.displays_failed", results["failed"])
```

## Monitoring Source Health

Track the health of each data source to detect when an airline or ATC feed goes silent:

```python
class SourceHealthMonitor:
    def __init__(self):
        self.last_message_time = {}

        self.source_freshness = meter.create_observable_gauge(
            "fids.source_freshness_seconds",
            description="Seconds since last message from each data source",
        )

    def record_message(self, source_name):
        self.last_message_time[source_name] = time.time()

    def check_source_health(self):
        """Periodic check for silent data sources."""
        with tracer.start_as_current_span("fids.source_health_check") as span:
            silent_sources = []

            for source, last_time in self.last_message_time.items():
                age = time.time() - last_time
                if age > 120:  # No message in 2 minutes
                    silent_sources.append(source)

            span.set_attribute("fids.silent_sources", str(silent_sources))
            span.set_attribute("fids.silent_count", len(silent_sources))

            if silent_sources:
                span.addEvent("sources_silent", {
                    "fids.sources": str(silent_sources),
                })
```

## End-to-End Freshness Tracking

The most important metric for FIDS is end-to-end freshness: how long from when something changes in the real world to when it appears on the display.

```python
e2e_freshness = meter.create_histogram(
    "fids.end_to_end_freshness_seconds",
    description="Total time from source event to display update",
    unit="s",
)

def track_end_to_end_freshness(source_timestamp, display_update_timestamp):
    freshness = display_update_timestamp - source_timestamp
    e2e_freshness.record(freshness, {})
```

## Conclusion

Monitoring the FIDS data pipeline with OpenTelemetry ensures that passengers always see accurate, up-to-date flight information. By tracing each update from source ingestion through data merge to display push, and by tracking source health and data freshness, airport operations teams can quickly identify and resolve issues that would otherwise leave passengers staring at stale information.
