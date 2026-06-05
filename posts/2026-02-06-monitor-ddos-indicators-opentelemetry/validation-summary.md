# Validation Summary: How to Use OpenTelemetry to Monitor DDoS Attack Indicators

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Python metrics API
- OpenTelemetry Python tracing API
- Python
- DDoS indicator monitoring
- GeoIP anomaly detection
- Slowloris and connection flood detection

## Sources Consulted
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Metrics SDK cardinality limit specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- CISA, Understanding and Responding to Distributed Denial-Of-Service Attacks: https://www.cisa.gov/resources-tools/resources/understanding-and-responding-distributed-denial-service-attacks
- OWASP Denial of Service Cheat Sheet: https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html
- Cloudflare Slowloris DDoS Attack reference: https://www.cloudflare.com/learning/ddos/ddos-attack-tools/slowloris

## Issues Found
- The `spike_detector.py` snippet used `request_rate`, `requests_by_country`, and `tracer` without importing them. Added an explicit import from `ddos_metrics` so the snippet is copy-consistent with the earlier metrics setup.
- The `geo_anomaly_detector.py` snippet used `tracer` without importing it and imported `defaultdict` unnecessarily. Added the `tracer` import and removed the unused `defaultdict` import.
- The `connection_monitor.py` snippet used `defaultdict`, `new_connections_rate`, `active_connections`, and `tracer` without importing them. Added the required imports.
- The `slowloris_detector.py` snippet used `tracer` without importing it. Added the required import.
- The Slowloris example comment said normal headers complete in under 5 seconds, but the code checks `header_time > 10`. Updated the comment to match the implemented 10-second threshold.

## Review Notes
The OpenTelemetry APIs used in the post are current and valid. The metric examples use `ddos.source_ip` attributes, which can create high-cardinality metric streams during an actual DDoS attack; in production, use aggregation, views, cardinality limits, or traces/logs for per-IP detail.
