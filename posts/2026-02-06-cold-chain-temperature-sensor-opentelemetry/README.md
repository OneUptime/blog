# How to Monitor Cold Chain Logistics Temperature Sensor Data Pipelines with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cold Chain, Temperature Monitoring, Logistics, Sensor Pipelines

Description: Monitor cold chain logistics temperature sensor data pipelines with OpenTelemetry to detect excursions and ensure compliance across the supply chain.

Cold chain logistics keeps perishable goods at controlled temperatures from production to consumption. Pharmaceuticals, vaccines, fresh produce, and frozen foods all depend on unbroken cold chains. A temperature excursion, even for a short period, can render an entire shipment worthless. Worse, in the case of pharmaceuticals, it can be dangerous.

The challenge is not just keeping things cold. It is proving that you kept things cold, with continuous monitoring data that satisfies regulatory requirements. OpenTelemetry provides a structured way to collect temperature sensor data, trace it through your pipeline, and detect excursions in near-real time.

## Cold Chain Monitoring Architecture

A typical cold chain monitoring setup:

```
Temperature Sensors (in truck/container/warehouse)
    --> Gateway Device (cellular/WiFi/satellite)
        --> Cloud Ingestion API
            --> Validation & Excursion Detection
                --> Time-Series Database
                --> Alert System
```

## Setting Up the Pipeline Instrumentation

```python
from opentelemetry import trace, metrics
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import time

# Tracing
provider = TracerProvider()
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter(endpoint="http://otel-collector:4317"))
)
trace.set_tracer_provider(provider)
tracer = trace.get_tracer("cold-chain-monitor")

# Metrics
reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=10000
)
metrics.set_meter_provider(MeterProvider(metric_readers=[reader]))
meter = metrics.get_meter("cold-chain-monitor")

# Temperature metrics
current_temperature = meter.create_gauge(
    "coldchain.temperature.current_celsius",
    description="Current temperature reading from sensor",
    unit="celsius"
)
temperature_readings_ingested = meter.create_counter(
    "coldchain.readings.ingested",
    description="Number of temperature readings successfully ingested"
)
readings_delayed = meter.create_counter(
    "coldchain.readings.delayed",
    description="Readings that arrived later than expected"
)
excursion_count = meter.create_counter(
    "coldchain.excursions.detected",
    description="Number of temperature excursions detected"
)
excursion_duration = meter.create_histogram(
    "coldchain.excursion.duration_minutes",
    description="Duration of temperature excursions",
    unit="min"
)
reading_age = meter.create_histogram(
    "coldchain.reading.age_seconds",
    description="Age of temperature readings when they reach the pipeline",
    unit="s"
)
sensor_battery = meter.create_gauge(
    "coldchain.sensor.battery_percent",
    description="Sensor battery level",
    unit="percent"
)
```

## Processing Temperature Readings

```python
def process_temperature_reading(reading):
    """
    Process a single temperature reading from a cold chain sensor.
    reading: {
        sensor_id, shipment_id, timestamp, temperature_c,
        humidity_pct, battery_pct, location_lat, location_lon
    }
    """
    with tracer.start_as_current_span("coldchain.process_reading") as span:
        now = time.time()
        sensor_id = reading["sensor_id"]
        shipment_id = reading["shipment_id"]
        temp_c = reading["temperature_c"]

        span.set_attribute("coldchain.sensor_id", sensor_id)
        span.set_attribute("coldchain.shipment_id", shipment_id)
        span.set_attribute("coldchain.temperature_c", temp_c)
        span.set_attribute("coldchain.humidity_pct", reading.get("humidity_pct", -1))

        # Track data freshness
        data_age = now - reading["timestamp"]
        reading_age.record(data_age, {"sensor_id": sensor_id})
        span.set_attribute("coldchain.data_age_seconds", data_age)

        # Flag delayed readings (sensor data older than 5 minutes)
        if data_age > 300:
            readings_delayed.add(1, {"sensor_id": sensor_id, "shipment_id": shipment_id})
            span.add_event("delayed_reading", {"age_seconds": data_age})

        # Record current temperature
        current_temperature.set(temp_c, {
            "sensor_id": sensor_id,
            "shipment_id": shipment_id
        })

        # Record battery level
        if "battery_pct" in reading:
            sensor_battery.set(reading["battery_pct"], {"sensor_id": sensor_id})

        # Validate and check for excursions
        shipment = get_shipment_config(shipment_id)
        check_temperature_excursion(reading, shipment)

        # Write to time-series database
        write_to_tsdb(reading)
        temperature_readings_ingested.add(1, {
            "sensor_id": sensor_id,
            "shipment_id": shipment_id
        })
```

## Temperature Excursion Detection

Excursion detection is the most critical part of the pipeline:

```python
# In-memory state for tracking ongoing excursions
active_excursions = {}  # (sensor_id, shipment_id) -> excursion state

def check_temperature_excursion(reading, shipment_config):
    """
    Check if a temperature reading is outside the acceptable range.
    Track excursion duration and severity.
    """
    sensor_id = reading["sensor_id"]
    shipment_id = reading["shipment_id"]
    temp_c = reading["temperature_c"]
    key = (sensor_id, shipment_id)

    min_temp = shipment_config["min_temp_c"]
    max_temp = shipment_config["max_temp_c"]
    product_type = shipment_config["product_type"]

    is_in_range = min_temp <= temp_c <= max_temp

    if not is_in_range:
        # Temperature is outside acceptable range
        if key not in active_excursions:
            # New excursion starting
            active_excursions[key] = {
                "start_time": reading["timestamp"],
                "peak_deviation": abs(temp_c - max_temp) if temp_c > max_temp else abs(min_temp - temp_c),
                "readings_count": 1
            }
            excursion_count.add(1, {
                "shipment_id": shipment_id,
                "product_type": product_type,
                "excursion_type": "high" if temp_c > max_temp else "low"
            })

            with tracer.start_as_current_span("coldchain.excursion.start") as span:
                span.set_attribute("coldchain.sensor_id", sensor_id)
                span.set_attribute("coldchain.shipment_id", shipment_id)
                span.set_attribute("coldchain.temp_c", temp_c)
                span.set_attribute("coldchain.min_allowed_c", min_temp)
                span.set_attribute("coldchain.max_allowed_c", max_temp)
                span.set_attribute("coldchain.product_type", product_type)
                span.set_status(trace.StatusCode.ERROR, "Temperature excursion detected")
        else:
            # Ongoing excursion, update peak deviation
            exc = active_excursions[key]
            deviation = abs(temp_c - max_temp) if temp_c > max_temp else abs(min_temp - temp_c)
            exc["peak_deviation"] = max(exc["peak_deviation"], deviation)
            exc["readings_count"] += 1

    elif key in active_excursions:
        # Temperature returned to range, close the excursion
        exc = active_excursions.pop(key)
        duration_minutes = (reading["timestamp"] - exc["start_time"]) / 60.0
        excursion_duration.record(duration_minutes, {
            "shipment_id": shipment_id,
            "product_type": product_type
        })

        with tracer.start_as_current_span("coldchain.excursion.resolved") as span:
            span.set_attribute("coldchain.excursion.duration_minutes", duration_minutes)
            span.set_attribute("coldchain.excursion.peak_deviation_c", exc["peak_deviation"])
            span.set_attribute("coldchain.excursion.readings_affected", exc["readings_count"])
```

## Batch Ingestion for Offline Sensors

Some cold chain sensors store readings locally and upload in batches when they regain connectivity:

```python
def process_offline_batch(sensor_id, shipment_id, readings):
    """
    Process a batch of readings from a sensor that was offline.
    These need to be processed in chronological order for correct excursion detection.
    """
    with tracer.start_as_current_span("coldchain.batch_ingest") as span:
        span.set_attribute("coldchain.sensor_id", sensor_id)
        span.set_attribute("coldchain.batch_size", len(readings))

        # Sort by timestamp to process in order
        sorted_readings = sorted(readings, key=lambda r: r["timestamp"])

        if sorted_readings:
            oldest = time.time() - sorted_readings[0]["timestamp"]
            newest = time.time() - sorted_readings[-1]["timestamp"]
            span.set_attribute("coldchain.oldest_reading_age_s", oldest)
            span.set_attribute("coldchain.newest_reading_age_s", newest)

        for reading in sorted_readings:
            reading["sensor_id"] = sensor_id
            reading["shipment_id"] = shipment_id
            process_temperature_reading(reading)
```

## Compliance Reporting

For regulatory compliance, you need to prove continuous monitoring:

```python
def generate_compliance_report(shipment_id):
    """Generate a compliance report showing continuous cold chain monitoring."""
    with tracer.start_as_current_span("coldchain.compliance_report") as span:
        span.set_attribute("coldchain.shipment_id", shipment_id)

        readings = get_all_readings(shipment_id)
        excursions = get_excursion_history(shipment_id)

        # Check for gaps in monitoring (missing readings)
        gaps = find_monitoring_gaps(readings, expected_interval_seconds=300)
        span.set_attribute("coldchain.compliance.total_readings", len(readings))
        span.set_attribute("coldchain.compliance.excursion_count", len(excursions))
        span.set_attribute("coldchain.compliance.monitoring_gaps", len(gaps))
        span.set_attribute("coldchain.compliance.compliant", len(gaps) == 0 and len(excursions) == 0)

        return {
            "shipment_id": shipment_id,
            "total_readings": len(readings),
            "excursions": excursions,
            "monitoring_gaps": gaps,
            "compliant": len(gaps) == 0 and len(excursions) == 0
        }
```

## Alerts

- **Any temperature excursion**: Immediate alert. For pharmaceuticals, even a brief excursion can require product disposition decisions.
- **Sensor data gap above 15 minutes**: The sensor may have lost connectivity or its battery died. Either way, you have a compliance gap.
- **Reading age above 10 minutes**: Data is arriving too slowly for real-time decision making.
- **Battery below 15%**: Replace or recharge the sensor before it goes offline.
- **Multiple sensors on same shipment showing excursions**: Could indicate a refrigeration unit failure rather than a sensor issue.

Cold chain monitoring is one of those domains where the data pipeline is not just an IT concern. It directly affects product safety and regulatory compliance. OpenTelemetry provides the structure to build a pipeline you can trust and audit.
