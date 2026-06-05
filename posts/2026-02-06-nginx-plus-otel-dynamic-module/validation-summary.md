# Validation Summary: How to Install the NGINX Plus OpenTelemetry Dynamic Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- NGINX Plus
- NGINX OpenTelemetry dynamic module
- OpenTelemetry Collector
- OTLP/gRPC
- Docker Compose

## Sources Consulted
- NGINX OpenTelemetry dynamic module admin guide: https://docs.nginx.com/nginx/admin-guide/dynamic-modules/opentelemetry/
- ngx_otel_module directive reference: https://nginx.org/en/docs/ngx_otel_module.html
- NGINX Plus live activity monitoring and REST API guide: https://docs.nginx.com/nginx/admin-guide/monitoring/live-activity-monitoring/
- NGINX Plus API module directive reference: https://nginx.org/en/docs/http/ngx_http_api_module.html
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The install commands and verification path did not match current NGINX Plus module packaging documentation. I updated Debian/Ubuntu commands to `apt`, added the `yum update` and `dnf` variants for supported RPM-based distributions, removed the generic Amazon Linux wording, and changed the module verification paths to `/usr/lib/nginx/modules/` and `/usr/lib64/nginx/modules/`.
- The `otel_exporter interval` examples used bare numeric values (`5000`, `10000`), which are not the documented examples for this directive. I changed them to explicit NGINX time values (`5s`, `10s`).
- The sampling example used `$request_id`; the official ratio-based tracing examples use `$otel_trace_id`. I updated the example to sample on `$otel_trace_id`.
- The post included a "Max Tag Length" section that appears to come from Envoy-style tracing configuration, not the NGINX OpenTelemetry module. I replaced it with NGINX-supported span attribute guidance using `otel_span_attr`.
- The benchmark table gave unsupported absolute latency overhead numbers and implied proportional sampling overhead. I replaced it with the NGINX documentation's stated request-processing overhead expectation and added a note to benchmark real traffic.
- The monitoring section claimed NGINX Plus exposes tracing-related module stats through the API. I corrected it to describe request and upstream status through the NGINX Plus API, and moved dropped-span monitoring to the Collector's internal metrics.
- The HA example showed an NGINX `upstream` block that cannot be used directly by `otel_exporter`, because `otel_exporter endpoint` takes a single endpoint. I changed the example to use a load-balanced Collector endpoint.
- The Docker Compose snippet used the obsolete top-level `version` field. I removed it to align with the current Compose Specification guidance.

## Review Notes
The Docker Compose image `myregistry/nginx-plus-otel:latest` is a placeholder and assumes the reader has access to a correctly built or private NGINX Plus image with subscription entitlements. The post is otherwise technically valid after the corrections above.
