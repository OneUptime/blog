# Validation Summary: How to Instrument CPE Provisioning Workflows with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry Python API
- OpenTelemetry metrics and tracing
- OpenTelemetry Collector OTLP receiver, batch processor, filter processor, and OTLP exporter
- TR-069 / CWMP CPE provisioning
- ACS provisioning workflows

## Sources Consulted
- OpenTelemetry Python manual instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python trace span API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/trace.span.html
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector filter processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/filterprocessor
- Broadband Forum TR-069 Issue 1 Amendment 4, CPE WAN Management Protocol: https://www.broadband-forum.org/pdfs/tr-069-1-4-0.pdf

## Issues Found
- The Python sample used `model_name` and `firmware_version` as if they were fields on the TR-069 `DeviceIdStruct`. TR-069 `DeviceIdStruct` contains `Manufacturer`, `OUI`, `ProductClass`, and `SerialNumber`, so the sample now records `cpe.product_class` instead.
- The duration metrics used `time.time()`, which is wall-clock time and can move backward or jump during clock adjustments. The sample now uses `time.perf_counter()` for elapsed duration measurements.
- Failed provisioning paths returned before recording some step durations and total workflow duration. The sample now records failed step durations before returning and records total duration in `finally` with a `result` attribute.
- The Collector filter processor was configured with the older `traces.span` style and was not included in the traces pipeline, so it would not have dropped periodic Inform spans as described. The configuration now uses current `trace_conditions` syntax and includes `filter` in the traces pipeline before `batch`.
- The periodic Inform filter used exact equality against a comma-joined event list. TR-069 Inform messages can contain multiple event codes, so the condition now uses `IsMatch` to drop spans where the event list contains `2 PERIODIC`.

## Review Notes
- The code remains illustrative and assumes application-specific ACS helper functions such as `lookup_device_in_inventory`, `send_set_parameter_values`, and `send_get_parameter_values`.
- The sample uses custom CPE attribute names because OpenTelemetry does not currently define standard semantic conventions for TR-069/CWMP provisioning workflows.
