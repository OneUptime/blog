# Validation Summary: How to Write EnvoyFilter YAML (Cheat Sheet)

## Status
validated

## Post Type
Reference / Cheat Sheet

## Technologies Covered
- Istio EnvoyFilter
- Envoy HTTP and network filters
- Kubernetes YAML
- istioctl
- Envoy Lua, local rate limit, CORS, access logging, and compressor filters

## Sources Consulted
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Envoy Lua filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/lua_filter
- Envoy Lua proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/lua/v3/lua.proto
- Envoy local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/local_rate_limit_filter
- Envoy HTTP connection manager proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto.html
- Envoy file access log proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/access_loggers/file/v3/file.proto.html
- Envoy CORS filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/cors_filter
- Envoy compressor filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/compressor_filter
- Envoy compressor proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/http/compressor/v3/compressor.proto
- Envoy regex matcher proto reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/type/matcher/v3/regex.proto

## Issues Found
- Corrected Envoy protobuf field names inside `patch.value` examples from lower camel case to the snake_case form used in current Istio and Envoy documentation, such as `typed_config`, `stat_prefix`, `token_bucket`, `access_log`, `common_http_protocol_options`, `connect_timeout`, and compressor fields.
- Replaced deprecated Lua `inlineCode` usage with `default_source_code.inline_string`, which is the current Envoy Lua configuration field.
- Changed the gateway Lua timestamp header value to `tostring(os.time())` because Envoy's Lua header API expects header values to be strings.
- Updated the local rate limit response header example to use the documented `x-local-rate-limit` header name.
- Updated the access log example to use `log_format.json_format` instead of the deprecated direct `json_format` field on `FileAccessLog`.
- Added the missing `LISTENER_FILTER` `applyTo` value.
- Clarified mesh-wide EnvoyFilter placement as the Istio config root namespace, which is often but not always `istio-system`.
- Fixed the CORS example by adding the required route or virtual-host `typed_per_filter_config` CORS policy; inserting the CORS filter alone does not make CORS policy enforcement work.
- Updated gzip compression enum and fields to match current Envoy compressor examples, including `compression_level: DEFAULT`.

## Review Notes
EnvoyFilter remains version-sensitive because it patches generated Envoy internals. The examples are valid as reference patterns, but real deployments should still match listener ports, virtual host names, and workload labels to the actual generated proxy configuration.
