# Validation Summary: How to Parse NGINX Access and Error Logs into Structured OpenTelemetry Log

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NGINX access logs
- NGINX error logs
- OpenTelemetry Collector
- OpenTelemetry Collector contrib filelog receiver
- Stanza log operators: json_parser, regex_parser, move, add, severity_parser
- OpenTelemetry semantic conventions
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector contrib filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/receiver/filelogreceiver
- OpenTelemetry Collector contrib Stanza operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/stanza/docs/operators
- OpenTelemetry Collector contrib severity parsing documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- OpenTelemetry semantic conventions for HTTP: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry semantic convention attribute registry for HTTP: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- NGINX ngx_http_log_module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- NGINX logging documentation: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/

## Issues Found
- The JSON access log example used deprecated OpenTelemetry HTTP semantic convention attributes such as `http.method`, `http.url`, `http.status_code`, `net.peer.ip`, `http.response_content_length`, and `http.user_agent`. Updated them to current attributes: `http.request.method`, `url.path`, `http.response.status_code`, `client.address`, `http.response.body.size`, and `user_agent.original`.
- The JSON access log example chained multiple `move` operators without explicit IDs. The filelog receiver documentation requires unique operator IDs when the same operator type appears more than once in a pipeline. Added unique IDs to each repeated `move` operator.
- The status-code severity mappings only covered selected HTTP status codes. Replaced them with the Collector's documented `2xx`, `3xx`, `4xx`, and `5xx` severity mapping aliases.
- The NGINX error-log severity mapping did not account for NGINX levels such as `notice`, `crit`, `alert`, and `emerg`. Added mappings so `notice` is treated as info and `crit`/`alert`/`emerg` are treated as fatal.
- The combined configuration repeated `move` operators without unique IDs and used deprecated HTTP semantic convention names. Added IDs and updated the attribute names.

## Review Notes
The YAML snippets parse successfully. The Collector configuration is still illustrative: production deployments may also want persistent file offset storage, explicit log file permissions, and backend-specific OTLP TLS settings.
