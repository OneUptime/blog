# Validation Summary: How to Handle Rate Limiting for WebSocket Connections in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio Gateway, VirtualService, DestinationRule, and EnvoyFilter
- Envoy WebSocket upgrades
- Envoy global rate limiting
- Envoy HTTP bandwidth limiting
- Kubernetes ConfigMap
- Prometheus
- JavaScript WebSocket client reconnection logic

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio rate limit task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Envoy HTTP upgrades documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/http/upgrades
- Envoy HTTP rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/rate_limit_filter
- Envoy network local rate limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/local_rate_limit_filter
- Envoy HTTP bandwidth limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/bandwidth_limit_filter.html
- Envoy TCP bandwidth limit filter documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/network_filters/tcp_bandwidth_limit_filter

## Issues Found
- The post said Istio's default route timeout would kill long-lived WebSocket connections. Istio's HTTP route timeout is disabled by default when unset, so the explanation was changed to say `timeout: 0s` explicitly disables the route timeout when a mesh or route-level timeout has been configured.
- The rate-limit EnvoyFilter matched a virtual host named `""`. Istio-generated virtual hosts are named as `host:port`, so the example was changed to `ws.example.com:80`.
- The connection duration section configured `stream_idle_timeout`, which is an idle timeout rather than a maximum connection duration. The heading, text, and resource name were changed to describe idle connection cleanup accurately.
- The bandwidth throttling example used `envoy.filters.network.local_ratelimit` and described its token bucket as byte-based throughput control. Envoy's network local rate limit filter limits incoming connection admission, not bandwidth. The example was changed to use Envoy's HTTP bandwidth limit filter with `limit_kbps`.

## Review Notes
The examples use `EnvoyFilter`, which Istio documents as exposing internal Envoy details that may change across upgrades. The post now reflects the verified behavior, but production users should still test these filters against the exact Istio and Envoy versions they run.
