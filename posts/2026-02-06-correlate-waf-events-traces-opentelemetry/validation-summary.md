# Validation Summary: How to Correlate WAF Events with App Traces Using the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- OpenTelemetry Collector Contrib
- OpenTelemetry syslog receiver
- OpenTelemetry attributes processor and batch processor
- OTLP receiver and exporter
- OpenTelemetry Python tracing and metrics APIs
- FastAPI HTTP middleware
- WAF event and application trace correlation

## Sources Consulted
- OpenTelemetry Collector syslog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/syslogreceiver/README.md
- OpenTelemetry Collector regex parser operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector operator error handling documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/on_error.md
- OpenTelemetry Collector groupbyattrs processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbyattrsprocessor/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Python metrics API documentation: https://opentelemetry-python.readthedocs.io/en/stable/api/metrics.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- FastAPI middleware documentation: https://fastapi.tiangolo.com/tutorial/middleware/
- RFC 5424, The Syslog Protocol: https://www.rfc-editor.org/rfc/rfc5424

## Issues Found
- The Collector `regex_parser` defaulted to parsing `body`, but the syslog parser stores the RFC5424 message text under `body.message`. Added `parse_from: body.message` so WAF-specific fields are parsed from the correct field.
- The post included a `groupbyattrs` processor block that was not used in either pipeline and could imply that the Collector natively correlates logs and traces across pipelines. Removed the unused block and left correlation to the backend/correlation service shown later in the post.
- The FastAPI span attributes used older HTTP semantic convention names: `http.url`, `http.method`, `http.user_agent`, and `http.status_code`. Updated them to `url.full`, `http.request.method`, `user_agent.original`, and `http.response.status_code`, while retaining the custom `security.source_ip` attribute used for the article's correlation example.
- The middleware accessed `request.client.host` directly. Added a `source_ip` variable that handles the optional `request.client` value before setting attributes.
- The middleware set `tenant.id` only inside the `user_id` guard, which could raise an attribute error if `user_id` existed but `tenant_id` did not. Added a separate `tenant_id` guard.
- The `waf_correlator.py` snippet referenced `tracer`, `waf_blocks_correlated`, and `waf_false_positives` without defining or importing them. Added an import from the preceding `waf_correlation.py` snippet.
- The introduction overstated what can be known for a request blocked at the WAF before it reaches the application. Reworded it to focus on likely user or tenant context rather than claiming the application would reveal what it would have done.

## Review Notes
- Extracted Python snippets were checked with `python3 -m py_compile`.
- Extracted Collector YAML was validated with `otel/opentelemetry-collector-contrib:0.153.0 validate`.
- The article's correlation approach remains an application/backend pattern, not a built-in OpenTelemetry Collector join. Matching on source IP and URI can be useful but may be imprecise behind NAT, proxies, or shared egress addresses; stronger request identifiers or trusted forwarded-client metadata would improve production accuracy.
