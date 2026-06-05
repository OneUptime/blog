# Validation Summary: How to Configure the Nginx Receiver in the OpenTelemetry Collector

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Collector Contrib Nginx receiver
- NGINX Open Source `ngx_http_stub_status_module`
- NGINX Plus API
- OTLP HTTP exporter
- OneUptime OTLP ingestion

## Sources Consulted
- OpenTelemetry Collector Contrib NGINX receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/nginxreceiver/README.md
- OpenTelemetry Collector Contrib NGINX receiver metadata: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/nginxreceiver/metadata.yaml
- OpenTelemetry Collector HTTP client configuration: https://github.com/open-telemetry/opentelemetry-collector/blob/main/config/confighttp/README.md
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector internal telemetry documentation: https://opentelemetry.io/docs/collector/internal-telemetry/
- NGINX `ngx_http_stub_status_module` documentation: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- NGINX Plus API documentation: https://docs.nginx.com/nginx/admin-guide/monitoring/nginx-plus-api-reference/
- NGINX Plus dynamic configuration API documentation: https://docs.nginx.com/nginx/admin-guide/load-balancer/dynamic-configuration-api/
- OneUptime OpenTelemetry Collector documentation: https://oneuptime.com/docs/en/telemetry/host-otel-collector

## Issues Found
- The post claimed that the OpenTelemetry Collector Nginx receiver collects from both `stub_status` and the NGINX Plus API. The official receiver documentation states that this receiver fetches stats from `ngx_http_stub_status_module`. I changed the receiver description and the NGINX Plus section to clarify that the receiver uses `stub_status`, and that NGINX Plus API metrics require a separate integration or custom collection path.
- The post listed separate metric names such as `nginx.connections_active`, `nginx.connections_reading`, `nginx.connections_writing`, and `nginx.connections_waiting`. The current receiver metadata exposes `nginx.connections_current` with a `state` attribute, plus `nginx.connections_accepted`, `nginx.connections_handled`, and `nginx.requests`. I updated the metric list and filter example accordingly.
- The NGINX examples used `stub_status on;`. Current NGINX documentation shows the directive syntax as `stub_status;`, with the argument form only required by versions before 1.7.5. I updated the examples to use the current syntax.
- The Mermaid diagram used multi-line node labels that may not render consistently. I changed those labels to use `<br/>`, which is accepted Mermaid label syntax.
- The NGINX Plus example originally presented the Plus API endpoint as a valid Nginx receiver endpoint. I replaced it with a `stub_status` receiver endpoint and retained a separate API enablement example for NGINX Plus API data.

## Review Notes
The post now matches the documented current Nginx receiver behavior. The examples assume the Collector Contrib distribution, since the Nginx receiver is a contrib component. Some production snippets are illustrative and still require the referenced auth extension or TLS files to exist in the actual deployment.
