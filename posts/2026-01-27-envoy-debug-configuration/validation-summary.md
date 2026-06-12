# Validation Summary: How to Debug Envoy Configuration Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Envoy Proxy
- Envoy admin interface
- Envoy v3 bootstrap, listener, route, cluster, health check, TLS, access log, tap, and circuit breaker configuration
- Kubernetes
- Istio sidecars
- jq and curl

## Sources Consulted
- Envoy Bootstrap v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/bootstrap/v3/bootstrap.proto
- Envoy administration interface documentation: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Envoy access logging documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/observability/access_log/usage
- Envoy ConfigDump v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/config_dump.proto
- Envoy HTTP route components v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy health check v3 API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/core/v3/health_check.proto
- Envoy cluster statistics documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy command line options: https://www.envoyproxy.io/docs/envoy/latest/operations/cli
- Istio ProxyConfig reference: https://istio.io/latest/docs/reference/config/networking/proxy-config/
- Istio annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio Envoy statistics configuration: https://istio.io/latest/docs/ops/configuration/telemetry/envoy-stats/

## Issues Found
- The admin interface example used `access_log_path`, which Envoy marks deprecated in favor of `admin.access_log`. Updated the snippet to use `envoy.access_loggers.file` with `FileAccessLog`.
- The `config_dump?resource=listeners` example used a top-level config dump name rather than the repeated resource field name expected by Envoy. Updated it to `resource=dynamic_listeners` and clarified other valid resource examples.
- The config dump jq example described cluster health status but actually returned configured health check definitions. Updated the comment and output key to `health_checks`.
- The access log field named `client_ip` used `%DOWNSTREAM_REMOTE_ADDRESS%`, which includes the downstream address and port. Renamed the field to `client_address`.
- The response flag `DT` was described as "Dynamic timeout"; corrected it to "Duration timeout".
- The performance stats example implied an exact plain-text output format for histogram percentiles. Reworded it as an interpretation rather than literal output.
- The Istio pod annotation placed `componentLogLevel` inside `proxy.istio.io/config`. Updated it to use the sidecar component log level annotation while keeping `proxyStatsMatcher` under `proxy.istio.io/config`.

## Review Notes
The post is technically relevant and current overall. Several configuration blocks are intentionally partial snippets, so they are useful as focused examples but would still need surrounding listener, cluster, and route context before being validated as complete standalone Envoy bootstrap files.
