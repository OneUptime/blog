# How to Instrument Remote Patient Monitoring (RPM) IoT Device Data Pipelines with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Remote Patient Monitoring, IoT, Healthcare

Description: Instrument remote patient monitoring IoT data pipelines with OpenTelemetry to track device readings from the patient's home to the clinical dashboard.

Remote Patient Monitoring (RPM) programs have exploded in adoption. Patients with chronic conditions like heart failure, COPD, and diabetes use connected devices at home to report blood pressure, weight, blood glucose, and pulse oximetry readings. These readings flow through cellular or WiFi gateways, into a cloud ingestion layer, through processing pipelines, and finally to a clinical dashboard where nurses and physicians review them. When a critical reading gets stuck in the pipeline, a patient who needs intervention does not get called.

This post covers how to instrument the complete RPM data pipeline with OpenTelemetry, from the device gateway to the clinical alert.

## RPM Pipeline Architecture

The typical RPM flow is: Patient device sends a reading via Bluetooth to a home gateway. The gateway forwards it over cellular or WiFi to a cloud endpoint. The cloud ingestion layer receives it, validates it, and pushes it into a processing queue. A consumer applies clinical rules (is this reading out of range?) and routes it to the appropriate clinical dashboard and alerting system.

## Instrumenting the Cloud Ingestion Endpoint

The first server-side component is the API that receives readings from home gateways:

```python
from fastapi import FastAPI, Request
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor
import time

# Tracing setup
trace_provider = TracerProvider()
trace_provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(trace_provider)
tracer = trace.get_tracer("rpm-ingestion", "1.0.0")

# Metrics setup
metric_reader = PeriodicExportingMetricReader(OTLPMetricExporter())
metrics.set_meter_provider(MeterProvider(metric_readers=[metric_reader]))
meter = metrics.get_meter("rpm-ingestion", "1.0.0")

# RPM-specific metrics
readings_received = meter.create_counter(
    "rpm.readings_received_total",
    description="Total device readings received",
)

ingestion_latency = meter.create_histogram(
    "rpm.ingestion_latency_ms",
    description="Time from device reading to cloud ingestion",
    unit="ms",
)

device_reporting_gap = meter.create_histogram(
    "rpm.device_reporting_gap_minutes",
    description="Gap between consecutive readings from a device",
    unit="min",
)

app = FastAPI()
FastAPIInstrumentor.instrument_app(app)


@app.post("/api/v1/readings")
async def ingest_reading(request: Request):
    """Receive a device reading from a home gateway."""
    payload = await request.json()

    with tracer.start_as_current_span("rpm.reading.ingest") as span:
        device_id = payload.get("device_id", "unknown")
        reading_type = payload.get("reading_type", "unknown")
        device_timestamp = payload.get("timestamp", 0)

        span.set_attribute("rpm.device_id", device_id)
        span.set_attribute("rpm.reading_type", reading_type)
        span.set_attribute("rpm.device_model", payload.get("model", "unknown"))
        span.set_attribute("rpm.gateway_type", payload.get("gateway", "cellular"))

        # Calculate transport delay from device to cloud
        if device_timestamp:
            transport_delay_ms = (time.time() - device_timestamp) * 1000
            span.set_attribute("rpm.transport_delay_ms", transport_delay_ms)
            ingestion_latency.record(transport_delay_ms, {
                "reading_type": reading_type,
                "gateway": payload.get("gateway", "cellular"),
            })

        # Check for reporting gaps (device not sending readings on schedule)
        with tracer.start_as_current_span("rpm.reporting_gap.check") as gap_span:
            last_reading_time = await get_last_reading_time(device_id)
            if last_reading_time:
                gap_minutes = (time.time() - last_reading_time) / 60
                gap_span.set_attribute("rpm.reporting_gap_minutes", gap_minutes)
                device_reporting_gap.record(gap_minutes, {"device_id": device_id})

                # Alert if device has not reported in expected interval
                expected_interval = get_expected_interval(device_id)
                if gap_minutes > expected_interval * 2:
                    gap_span.add_event("reporting_gap_exceeded", {
                        "gap_minutes": gap_minutes,
                        "expected_interval_minutes": expected_interval,
                    })

        # Validate the reading
        with tracer.start_as_current_span("rpm.reading.validate") as val_span:
            validation = validate_reading(payload)
            val_span.set_attribute("rpm.validation.passed", validation["valid"])
            val_span.set_attribute("rpm.validation.reason",
                                  validation.get("reason", "ok"))

        if validation["valid"]:
            # Push to processing queue
            await enqueue_reading(payload)
            readings_received.add(1, {
                "reading_type": reading_type,
                "status": "accepted",
            })
        else:
            readings_received.add(1, {
                "reading_type": reading_type,
                "status": "rejected",
            })

        return {"status": "accepted" if validation["valid"] else "rejected"}
```

## Processing Pipeline with Clinical Rules

The consumer applies clinical rules to determine if a reading is out of range and needs attention:

```python
from opentelemetry.propagate import inject, extract

async def process_reading(message):
    """Process a reading from the queue and apply clinical rules."""
    # Extract trace context from queue message headers
    ctx = extract(message.headers)

    with tracer.start_as_current_span("rpm.reading.process", context=ctx) as span:
        reading = message.value
        reading_type = reading.get("reading_type", "unknown")

        span.set_attribute("rpm.reading_type", reading_type)
        span.set_attribute("rpm.device_id", reading.get("device_id", ""))

        # Apply clinical thresholds based on reading type
        with tracer.start_as_current_span("rpm.clinical_rules.evaluate") as rules_span:
            rule_result = evaluate_clinical_rules(reading)

            rules_span.set_attribute("rpm.rules.triggered_count",
                                   len(rule_result["triggered_rules"]))
            rules_span.set_attribute("rpm.rules.severity",
                                   rule_result.get("max_severity", "normal"))

            for rule in rule_result["triggered_rules"]:
                rules_span.add_event(f"rule_triggered_{rule['id']}", {
                    "rule_name": rule["name"],
                    "severity": rule["severity"],
                })

        # Store the reading in the time-series database
        with tracer.start_as_current_span("rpm.storage.write") as store_span:
            store_span.set_attribute("db.system", "timescaledb")
            await store_reading(reading)

        # Route based on clinical assessment
        severity = rule_result.get("max_severity", "normal")

        if severity == "critical":
            with tracer.start_as_current_span("rpm.alert.critical") as alert_span:
                await send_critical_alert(reading, rule_result)
                alert_span.set_attribute("rpm.alert.type", "critical")
                alert_span.set_attribute("rpm.alert.channel", "pager")

        elif severity == "warning":
            with tracer.start_as_current_span("rpm.alert.warning") as alert_span:
                await send_warning_notification(reading, rule_result)
                alert_span.set_attribute("rpm.alert.type", "warning")
                alert_span.set_attribute("rpm.alert.channel", "dashboard")

        # Update the clinical dashboard in real time
        with tracer.start_as_current_span("rpm.dashboard.update") as dash_span:
            await push_to_dashboard(reading, rule_result)
            dash_span.set_attribute("rpm.dashboard.updated", True)


def evaluate_clinical_rules(reading):
    """Apply clinical threshold rules to a device reading."""
    reading_type = reading.get("reading_type")
    value = reading.get("value")
    triggered = []

    # Blood pressure rules
    if reading_type == "blood_pressure":
        systolic = value.get("systolic", 0)
        diastolic = value.get("diastolic", 0)

        if systolic > 180 or diastolic > 120:
            triggered.append({
                "id": "bp_hypertensive_crisis",
                "name": "Hypertensive Crisis",
                "severity": "critical",
            })
        elif systolic > 140 or diastolic > 90:
            triggered.append({
                "id": "bp_elevated",
                "name": "Elevated Blood Pressure",
                "severity": "warning",
            })

    # Weight rules (sudden weight gain may indicate fluid retention)
    elif reading_type == "weight":
        weight_kg = value.get("weight_kg", 0)
        previous_weight = get_previous_reading(reading["device_id"], "weight")
        if previous_weight:
            change_kg = weight_kg - previous_weight["value"]["weight_kg"]
            # Gain of more than 1.5kg in 24 hours is concerning for heart failure
            if change_kg > 1.5:
                triggered.append({
                    "id": "weight_rapid_gain",
                    "name": "Rapid Weight Gain",
                    "severity": "warning",
                })

    # Pulse oximetry rules
    elif reading_type == "pulse_ox":
        spo2 = value.get("spo2", 100)
        if spo2 < 88:
            triggered.append({
                "id": "spo2_critical",
                "name": "Critical SpO2",
                "severity": "critical",
            })
        elif spo2 < 92:
            triggered.append({
                "id": "spo2_low",
                "name": "Low SpO2",
                "severity": "warning",
            })

    max_severity = "normal"
    if any(r["severity"] == "critical" for r in triggered):
        max_severity = "critical"
    elif any(r["severity"] == "warning" for r in triggered):
        max_severity = "warning"

    return {"triggered_rules": triggered, "max_severity": max_severity}
```

## Monitoring Device Fleet Health

Beyond individual readings, you need visibility into the health of your device fleet:

```python
# Periodic job to check device fleet status
async def check_fleet_health():
    """Check the health of all enrolled RPM devices."""
    with tracer.start_as_current_span("rpm.fleet.health_check") as span:
        all_devices = await get_enrolled_devices()
        span.set_attribute("rpm.fleet.total_devices", len(all_devices))

        not_reporting = 0
        low_battery = 0

        for device in all_devices:
            last_seen = device.get("last_seen_at", 0)
            hours_since_last = (time.time() - last_seen) / 3600

            if hours_since_last > 24:
                not_reporting += 1
            if device.get("battery_level", 100) < 20:
                low_battery += 1

        span.set_attribute("rpm.fleet.not_reporting_24h", not_reporting)
        span.set_attribute("rpm.fleet.low_battery", low_battery)
```

## Summary

Instrumenting RPM pipelines with OpenTelemetry gives you end-to-end visibility from the patient's home device to the clinical dashboard. The critical metrics to track are transport delay (how long it takes a reading to get from device to cloud), processing latency (how long clinical rule evaluation takes), alerting latency for critical readings, and device reporting gaps (devices that stop sending data). In RPM programs, a silent device is often more concerning than an abnormal reading because it might mean the patient stopped using the device or the device malfunctioned.
