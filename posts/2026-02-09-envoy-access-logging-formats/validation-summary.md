# Validation Summary: How to implement Envoy access logging with custom formats

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Envoy Proxy
- Envoy access logging
- Envoy access log command operators
- Envoy access log filters
- Envoy gRPC Access Log Service
- YAML configuration

## Sources Consulted
- Envoy access logging usage documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage.html
- Envoy file access log API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/access_loggers/file/v3/file.proto
- Envoy common access log types and filters API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/accesslog/v3/accesslog.proto
- Envoy gRPC Access Log Service API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/access_loggers/grpc/v3/als.proto.html
- Envoy router filter API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/router/v3/router.proto.html
- Envoy HTTP route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto.html
- Envoy substitution format string API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/substitution_format_string.proto.html

## Issues Found
- The custom text format example used the deprecated top-level `format` field on `FileAccessLog`. Updated it to use `log_format.text_format_source.inline_string`, which is the current non-deprecated form.
- The JSON access logging example used the deprecated top-level `typed_json_format` field on `FileAccessLog`. Updated it to use `log_format.json_format`, which preserves typed JSON rendering through `SubstitutionFormatString`.
- The response flag list used `UR` for upstream retry limit exceeded. Updated it to `URX`; `UR` means upstream remote reset in current Envoy response flags.
- The per-route logging example configured `access_log` inside `envoy.extensions.filters.http.router.v3.Router`, but that field does not exist. Updated the section to describe per-route upstream access logs and changed the field to `upstream_log`.

## Review Notes
The snippets are partial Envoy configuration fragments rather than complete bootstrap or listener configurations. They are valid in the intended context, such as HTTP connection manager access logs and route `typed_per_filter_config`, but would need surrounding listener, route, cluster, and filter configuration to run as a full Envoy config.
