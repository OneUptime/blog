# Validation Summary: How to Mirror Traffic with Istio for Testing

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Istio traffic mirroring
- Istio VirtualService, DestinationRule, Gateway, and EnvoyFilter resources
- Kubernetes Deployments and Services
- Prometheus and Prometheus Operator ServiceMonitor
- Grafana dashboards
- Kiali
- Envoy sidecar proxy metrics

## Sources Consulted
- Istio Traffic Mirroring documentation: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio Standard Metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio Prometheus integration documentation: https://istio.io/latest/docs/ops/integrations/prometheus/
- Istio secure metrics scraping documentation: https://istio.io/latest/docs/tasks/observability/metrics/secure-metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Prometheus Operator API reference: https://prometheus-operator.dev/docs/api-reference/api/

## Issues Found
- The Istio VirtualService, DestinationRule, and Gateway snippets used `networking.istio.io/v1beta1`. Updated them to the current stable `networking.istio.io/v1` API used by current Istio documentation.
- The prerequisites pinned old generic Kubernetes and Istio minimums. Replaced them with version guidance tied to the installed Istio release and removed an outdated comment about mirroring compatibility.
- The namespace injection check said `istio-injection=enabled` must be present. Updated it to also account for revision-based injection using `istio.io/rev`.
- The ServiceMonitor example selected a service port that was not declared in the Kubernetes Service snippet and did not select the application namespace. Added an optional `http-envoy-prom` service port and a `namespaceSelector` for the application namespace.
- The best-practices section described a timeout configuration but showed only connection pool and outlier detection settings. Renamed that guidance to traffic policies and corrected the comments.
- The EnvoyFilter example used the wrong Istio API version and an outdated/incorrect Lua typed config shape. Changed it to `networking.istio.io/v1alpha3`, inserted the Lua filter before the router sub-filter, and used `defaultSourceCode.inlineString` as shown in Istio's EnvoyFilter examples.

## Review Notes
The post is technically relevant and the main Istio mirroring behavior is accurate: mirrored requests are best-effort, do not block the primary response path, use a `-shadow` Host/Authority suffix, and can be controlled with `mirrorPercentage`. The monitoring examples are illustrative; real Prometheus Operator installations may also require matching Prometheus selectors/RBAC or Istio's built-in Prometheus scrape configuration.
