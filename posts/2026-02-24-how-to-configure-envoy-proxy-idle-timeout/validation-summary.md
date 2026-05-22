# Validation Summary: How to Configure Envoy Proxy Idle Timeout

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Envoy Proxy
- Istio
- Kubernetes
- EnvoyFilter
- DestinationRule
- VirtualService
- AWS Application Load Balancer

## Sources Consulted
- Envoy timeout FAQ: https://www.envoyproxy.io/docs/envoy/latest/faq/configuration/timeouts.html
- Envoy HTTP connection manager API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/http_connection_manager/v3/http_connection_manager.proto
- Envoy HTTP route components API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/route/v3/route_components.proto
- Envoy TCP proxy API reference: https://www.envoyproxy.io/docs/envoy/latest/api-v3/extensions/filters/network/tcp_proxy/v3/tcp_proxy.proto.html
- Envoy cluster statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/upstream/cluster_manager/cluster_stats.html
- Envoy listener statistics reference: https://www.envoyproxy.io/docs/envoy/latest/configuration/listeners/stats
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- AWS Application Load Balancer attributes documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/edit-load-balancer-attributes.html

## Issues Found
- The post described HTTP/1.1 stream idle timeout as the same as connection idle timeout. Updated the explanation to distinguish active stream idle timeout from connection idle timeout.
- The default timeout section attributed the defaults directly to Istio and used camelCase Envoy field names. Updated it to describe Envoy defaults used by Istio unless overridden, and used Envoy's documented field names.
- The stream idle timeout section implied a VirtualService route timeout changes stream idle timeout. Updated the wording to clarify that VirtualService `timeout` controls request timeout, while stream idle timeout requires EnvoyFilter configuration.
- Several EnvoyFilter snippets used camelCase field names such as `typedConfig`, `streamIdleTimeout`, `idleTimeout`, and `commonHttpProtocolOptions`. Updated those snippets to the snake_case field names used in Envoy and Istio documentation.
- The per-route idle timeout example patched a full route configuration while trying to modify a route. Updated it to use `applyTo: HTTP_ROUTE` and merge the route's `idle_timeout`.
- The AWS ALB coordination section recommended setting Envoy lower than the ALB idle timeout. Updated it to follow AWS guidance that the application idle timeout should be larger than the ALB idle timeout.
- The monitoring section listed Prometheus metric names for a `/stats` command. Updated it to show Envoy admin stats names and noted the Prometheus-exported names separately.

## Review Notes
EnvoyFilter behavior can vary with generated route names and Istio proxy versions. The examples now use current documented APIs and field names, but production users should still verify matches with `istioctl proxy-config` before rollout.
