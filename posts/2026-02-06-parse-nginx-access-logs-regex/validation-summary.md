# Validation Summary: How to Parse NGINX Access Logs into Structured OpenTelemetry Attributes

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- NGINX access logging and `log_format`
- OpenTelemetry Collector Contrib filelog receiver
- Stanza `regex_parser`, `json_parser`, `move`, `remove`, and `severity_parser` operators
- OpenTelemetry semantic conventions for HTTP, URL, client, network, and user agent attributes
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib filelog receiver README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Collector Contrib Stanza `regex_parser` operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/regex_parser.md
- OpenTelemetry Collector Contrib Stanza `json_parser` operator docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/json_parser.md
- OpenTelemetry Collector Contrib Stanza timestamp parsing docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/timestamp.md
- OpenTelemetry Collector Contrib Stanza severity parsing docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/types/severity.md
- NGINX logging admin guide: https://docs.nginx.com/nginx/admin-guide/monitoring/logging/
- NGINX `ngx_http_log_module` documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- OpenTelemetry semantic convention registry: https://github.com/open-telemetry/semantic-conventions

## Issues Found
- The timestamp layouts used Go time format strings, but the Collector's timestamp parser defaults to `strptime`. Changed NGINX `$time_local` parsing to `%d/%b/%Y:%H:%M:%S %z`.
- The JSON log timestamp used `%z`, but NGINX `$time_iso8601` emits an ISO 8601 offset with a colon. Changed the layout to `%Y-%m-%dT%H:%M:%S%j`.
- The examples mapped the entire request target, which can include a query string, to `url.path`. Changed this to `url.original`, which matches the observed request target more accurately.
- The examples mapped NGINX timing fields to attributes that are not OpenTelemetry semantic convention attributes for logs. Changed them to custom `nginx.request_time` and `nginx.upstream_response_time` attributes.
- The custom-format example moved the full `HTTP/1.1` protocol string to `network.protocol.version`, which should contain only the version. Removed that semantic mapping from the example.

## Review Notes
The regex examples are suitable for the shown NGINX formats, but production deployments with unusual request targets, escaped quotes, or multi-upstream timing values may need adjusted patterns. Numeric fields captured by `regex_parser` remain strings unless converted later in the pipeline.
