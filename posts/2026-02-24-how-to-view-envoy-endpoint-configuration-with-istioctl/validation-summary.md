# Validation Summary: How to View Envoy Endpoint Configuration with istioctl

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Istio
- istioctl
- Envoy endpoint discovery and outlier detection
- Kubernetes Services, Pods, and EndpointSlices
- DestinationRule and VirtualService traffic policy concepts
- Python JSON parsing for command-line inspection

## Sources Consulted
- Istio command reference for `istioctl proxy-config endpoint`: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio diagnostic tools documentation for Envoy endpoint inspection: https://istio.io/latest/docs/ops/diagnostic-tools/proxy-cmd/
- Istio DestinationRule reference for outlier detection defaults and subset behavior: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio VirtualService reference for weighted routing: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Envoy admin API reference for cluster and host status JSON fields: https://www.envoyproxy.io/docs/envoy/latest/api-v3/admin/v3/clusters.proto.html
- Envoy endpoint API reference for EDS endpoint weights and health status: https://www.envoyproxy.io/docs/envoy/latest/api-v3/config/endpoint/v3/endpoint_components.proto
- Envoy degraded endpoints documentation: https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/degraded
- Kubernetes Service documentation covering deprecated Endpoints and EndpointSlice replacement: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/tasks/administer-cluster/enabling-endpointslices/

## Issues Found
- The opening description implied every pod always becomes an Envoy endpoint. Updated it to say ready pods for the relevant port usually become endpoints, which is more accurate for Kubernetes service discovery.
- The post used the legacy Kubernetes Endpoints API for service discovery checks. Kubernetes Endpoints is deprecated in favor of EndpointSlices, so the Kubernetes comparison and stale-endpoint checks now use `kubectl get endpointslice`.
- The `UNHEALTHY` status description said it only means active health checks are failing. Updated it to include EDS-provided health, which is common in Istio.
- The `DEGRADED` status description incorrectly described priority-level support. Updated it to match Envoy degraded-host behavior.
- The outlier detection example showed `UNHEALTHY` with `FAILED`, then described outlier ejection. Updated the example to `HEALTHY` with `FAILED`, matching the article's own explanation that outlier ejection can occur separately from endpoint health status.
- The post said DestinationRules can assign different endpoint weights. Updated this to clarify that Istio subset traffic weights are normally configured in VirtualService routes, while the Envoy endpoint `weight` field represents EDS per-endpoint weighting.

## Review Notes
The `istioctl proxy-config endpoints` commands, `--cluster` flag, `-o json` output mode, proxy-status sync check, and DestinationRule outlier detection fields are valid in current Istio documentation. The exact endpoint status values and JSON fields can vary by Envoy/Istio version and generated proxy state, but the corrected examples match the documented command shape and Envoy admin API model.
