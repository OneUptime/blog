# How to Build Predictive Maintenance Observability by Correlating Machine Vibration Metrics with OpenTelemetry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Predictive Maintenance, Vibration Analysis, Manufacturing, Metrics

Description: Build a predictive maintenance observability system that correlates machine vibration sensor data with OpenTelemetry metrics for early fault detection.

Unplanned downtime on a factory floor is expensive. A single bearing failure on a critical motor can halt an entire production line. Predictive maintenance aims to catch these failures before they happen by monitoring vibration signatures, temperature trends, and other sensor data. OpenTelemetry provides a solid foundation for collecting, correlating, and exporting these metrics to your observability platform.

This post shows how to build a vibration monitoring pipeline with OpenTelemetry that catches degradation patterns early.

## Vibration Data Basics

Accelerometers mounted on rotating machinery produce vibration readings. Healthy machines have predictable vibration profiles. As bearings wear or shafts become misaligned, specific frequency components change. The key metrics to track are:

- **RMS velocity** (mm/s): Overall vibration level
- **Peak acceleration** (g): Shock and impact events
- **Crest factor**: Ratio of peak to RMS, indicates bearing damage
- **Dominant frequency** (Hz): Shifts indicate specific fault types

## Setting Up the Metrics Pipeline

```python
from opentelemetry import metrics
from opentelemetry.sdk.metrics import MeterProvider
from opentelemetry.sdk.metrics.export import PeriodicExportingMetricReader
from opentelemetry.exporter.otlp.proto.grpc.metric_exporter import OTLPMetricExporter
import numpy as np

# Configure the meter provider to export every 10 seconds
metric_reader = PeriodicExportingMetricReader(
    OTLPMetricExporter(endpoint="http://otel-collector:4317"),
    export_interval_millis=10000
)
provider = MeterProvider(metric_readers=[metric_reader])
metrics.set_meter_provider(provider)
meter = metrics.get_meter("predictive-maintenance")

# Define metrics for each vibration characteristic
rms_velocity = meter.create_histogram(
    "machine.vibration.rms_velocity_mm_s",
    description="RMS vibration velocity in mm/s",
    unit="mm/s"
)
peak_acceleration = meter.create_histogram(
    "machine.vibration.peak_acceleration_g",
    description="Peak acceleration in g-force units",
    unit="g"
)
crest_factor = meter.create_gauge(
    "machine.vibration.crest_factor",
    description="Ratio of peak to RMS - high values indicate bearing faults"
)
dominant_freq = meter.create_gauge(
    "machine.vibration.dominant_frequency_hz",
    description="Dominant vibration frequency in Hz",
    unit="Hz"
)
temperature = meter.create_gauge(
    "machine.bearing.temperature_celsius",
    description="Bearing temperature from IR sensor",
    unit="celsius"
)
```

## Reading and Processing Sensor Data

The collector service reads raw accelerometer data, computes the metrics, and records them:

```python
import time

def process_vibration_sample(raw_data, machine_id, bearing_id, sample_rate=25600):
    """
    Process a raw vibration sample from an accelerometer.
    raw_data: numpy array of acceleration values
    sample_rate: samples per second (typical for vibration monitoring)
    """
    # Common attributes for all metrics from this sensor
    attrs = {
        "machine.id": machine_id,
        "machine.bearing": bearing_id,
        "machine.line": get_production_line(machine_id),
        "facility": get_facility_name(machine_id)
    }

    # Compute RMS velocity from acceleration data
    # Integrate acceleration to get velocity, then compute RMS
    velocity = np.cumsum(raw_data) / sample_rate
    velocity_rms = np.sqrt(np.mean(velocity ** 2)) * 1000  # Convert to mm/s
    rms_velocity.record(velocity_rms, attrs)

    # Peak acceleration
    peak_g = np.max(np.abs(raw_data))
    peak_acceleration.record(peak_g, attrs)

    # Crest factor -- a rising crest factor often indicates early bearing damage
    rms_accel = np.sqrt(np.mean(raw_data ** 2))
    cf = peak_g / rms_accel if rms_accel > 0 else 0
    crest_factor.set(cf, attrs)

    # FFT to find dominant frequency
    fft_result = np.fft.rfft(raw_data)
    freqs = np.fft.rfftfreq(len(raw_data), d=1.0/sample_rate)
    dominant_idx = np.argmax(np.abs(fft_result[1:])) + 1  # Skip DC component
    dominant_freq.set(freqs[dominant_idx], attrs)

    return {
        "rms_velocity": velocity_rms,
        "peak_g": peak_g,
        "crest_factor": cf,
        "dominant_freq": freqs[dominant_idx]
    }
```

## Correlating with Temperature Data

Vibration alone does not tell the full story. Correlating vibration metrics with bearing temperature makes fault detection more reliable:

```python
def collect_machine_health(machine_id):
    """
    Collect all health metrics for a machine and record them together.
    This runs on a 10-second interval for each monitored machine.
    """
    bearings = get_bearing_list(machine_id)

    for bearing_id in bearings:
        # Read vibration data (1 second of samples at 25.6 kHz)
        raw_vibration = read_accelerometer(machine_id, bearing_id)
        vibration_results = process_vibration_sample(raw_vibration, machine_id, bearing_id)

        # Read temperature from IR sensor on the same bearing
        temp_celsius = read_ir_temperature(machine_id, bearing_id)
        temperature.set(temp_celsius, {
            "machine.id": machine_id,
            "machine.bearing": bearing_id,
            "machine.line": get_production_line(machine_id),
            "facility": get_facility_name(machine_id)
        })

        # Log a warning if we see the classic degradation pattern:
        # rising crest factor + rising temperature + stable RMS
        if (vibration_results["crest_factor"] > 5.0 and
                temp_celsius > get_baseline_temp(machine_id, bearing_id) * 1.15):
            log_degradation_warning(machine_id, bearing_id, vibration_results, temp_celsius)
```

## Alert Configuration

Set up alerts based on ISO 10816 vibration severity standards:

```yaml
# Example alert rules for your observability platform
alerts:
  - name: high_vibration_rms
    metric: machine.vibration.rms_velocity_mm_s
    condition: p95 > 4.5    # ISO 10816 "unsatisfactory" threshold for Class II machines
    duration: 5m
    labels:
      severity: warning

  - name: bearing_degradation_pattern
    # Crest factor above 6 combined with temperature rise
    metric: machine.vibration.crest_factor
    condition: value > 6.0
    duration: 10m
    labels:
      severity: critical

  - name: frequency_shift
    # Dominant frequency changed by more than 10% from baseline
    metric: machine.vibration.dominant_frequency_hz
    condition: abs(value - baseline) / baseline > 0.10
    duration: 15m
    labels:
      severity: warning
```

## Practical Tips

When deploying this in a real factory environment, keep these things in mind:

- **Sample at the right rate**: For standard bearing monitoring, 25.6 kHz is a common choice. Lower rates miss high-frequency defect signatures.
- **Use resource attributes**: Tag every metric with `machine.id`, `bearing_id`, and `production_line` so you can filter and group in your dashboards.
- **Establish baselines first**: Run the system for a week on healthy machines to establish normal vibration profiles. Alerts based on absolute thresholds without baselines will generate too much noise.
- **Batch your FFT calculations**: FFT is CPU-intensive. If you are monitoring 50+ machines, batch the calculations and stagger them across the collection interval.

The result is a system where you can see vibration trends across your entire fleet of machines, drill down to individual bearings, and catch degradation weeks before a catastrophic failure.
