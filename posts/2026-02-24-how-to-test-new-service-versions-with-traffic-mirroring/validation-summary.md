# Validation Summary: How to Test New Service Versions with Traffic Mirroring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio traffic mirroring
- Kubernetes Deployments and Services
- Envoy sidecar proxy
- istioctl
- Prometheus metrics
- Kiali and Grafana

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio querying metrics from Prometheus task: https://istio.io/latest/docs/tasks/observability/metrics/querying-metrics/
- Istio supported releases page: https://istio.io/latest/docs/releases/supported-releases/

## Issues Found
- The post described mirroring as having "no risk" and "zero impact on production traffic." Istio discards mirrored responses and does not wait for them before returning the primary response, but mirrored traffic can still create load and side effects. I changed the wording to say v2 is not in the user-facing response path and that v2 errors or latency do not affect the stable response.
- The prerequisite recommended Istio 1.18+, which is no longer a current support recommendation. I changed it to require a supported Istio release.
- The post referred only to the `Host` header for mirrored requests. Istio documents this as the `Host`/`Authority` header, so I updated the wording.
- The monitoring command was labeled as checking Envoy metrics and grepped for `payment-service-v2`, but `istioctl proxy-config cluster` checks Envoy cluster configuration and cluster names normally encode the subset separately. I changed the text and command to use `--fqdn payment-service.default.svc.cluster.local --subset v2`.

## Review Notes
The VirtualService and DestinationRule examples use current `networking.istio.io/v1` APIs and match Istio's documented mirroring syntax. The Prometheus example uses standard Istio metric labels, assuming the service is in the `default` namespace as shown by the query.
