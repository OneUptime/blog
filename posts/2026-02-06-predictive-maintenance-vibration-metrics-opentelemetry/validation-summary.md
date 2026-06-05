# Validation Summary: How to Build Predictive Maintenance Observability by Correlating Machine

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry OTLP gRPC metric exporter
- NumPy vibration signal processing
- FFT-based frequency analysis
- Predictive maintenance alerting
- ISO 20816 vibration measurement and evaluation guidance

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry metric semantic conventions: https://opentelemetry.io/docs/specs/semconv/general/metrics/
- OpenTelemetry hardware temperature semantic conventions: https://opentelemetry.io/docs/specs/semconv/hardware/temperature/
- OpenTelemetry OTLP exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- ISO 20816-1:2016 overview: https://www.iso.org/standard/63180.html
- ISO 10816-1:1995 status page: https://www.iso.org/standard/18866.html
- UCUM specification: https://ucum.org/ucum

## Issues Found
- Metric names included units even though OpenTelemetry recommends carrying units in instrument metadata. Renamed the vibration and temperature metric instruments to remove suffixes like `_mm_s`, `_g`, `_hz`, and `_celsius`, and updated alert references.
- The peak acceleration instrument used `unit="g"`, which is grams in UCUM rather than standard gravity. Changed it to `unit="[g]"` and clarified the description.
- The temperature instrument used `unit="celsius"`, while OpenTelemetry/UCUM convention uses `Cel` for degrees Celsius. Updated the unit.
- The velocity calculation treated accelerometer values as both g-units and m/s^2. Clarified that `raw_data` is in standard gravity units, removed the DC offset before integration, and converted to m/s^2 before computing RMS velocity.
- The alert section referred to ISO 10816 as current. ISO lists ISO 10816-1 as withdrawn with ISO 20816-1 as the newer version, so the post now refers to ISO 20816 guidance and frames the 4.5 mm/s threshold as an example to tune by machine type and mounting.
- The practical tips called measurement attributes "resource attributes" and used names that did not match the code. Updated the wording to "consistent attributes" and aligned the attribute names with the examples.

## Review Notes
The OpenTelemetry Python API calls shown in the post are current: `MeterProvider`, `PeriodicExportingMetricReader`, `OTLPMetricExporter`, `create_histogram`, `create_gauge`, `record`, and `set` match the documented interfaces. The helper functions in the snippets remain placeholders, which is acceptable for a blog-level tutorial.
