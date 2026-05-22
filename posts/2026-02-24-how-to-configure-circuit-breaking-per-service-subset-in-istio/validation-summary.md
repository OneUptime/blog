# Validation Summary: How to Configure Circuit Breaking per Service Subset in Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio DestinationRule
- Istio VirtualService
- Istio traffic subsets
- Istio circuit breaking and outlier detection
- Envoy admin interface and cluster metrics
- Kubernetes kubectl

## Sources Consulted
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Traffic Management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio Circuit Breaking task: https://istio.io/latest/docs/tasks/traffic-management/circuit-breaking/
- Envoy administration interface reference: https://www.envoyproxy.io/docs/envoy/latest/operations/admin.html
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/

## Issues Found
- The post used `networking.istio.io/v1beta1` in all Istio examples. Istio's current documentation uses `networking.istio.io/v1` for DestinationRule and VirtualService examples, so the snippets were updated to the current stable API version.
- The canary deployment section said that if the canary is broken, it is removed from the pool entirely and all traffic goes to stable. Outlier detection ejects unhealthy endpoints within the canary subset's cluster; it does not automatically rewrite the VirtualService route so the canary's 5% weight goes to stable. The text was corrected to say that traffic routed to the canary subset has no healthy canary endpoint if all canary endpoints are ejected.
- The subset override section said a subset-level `trafficPolicy` completely replaces the top-level policy and that `outlierDetection` is not inherited when only `connectionPool` is specified at the subset level. Istio's DestinationRule reference says subsets inherit DestinationRule-level traffic policies and override corresponding subset-level settings. The section was corrected to describe inheritance and corresponding-setting overrides.

## Review Notes
- The `kubectl exec deploy/... -c istio-proxy -- ...` command form is valid according to the Kubernetes kubectl reference.
- The Envoy `config_dump?resource=dynamic_active_clusters` usage is consistent with Envoy's admin interface documentation for resource-filtered config dumps.
- Istio's reference recommends fully qualified service names to avoid namespace ambiguity when using short hosts. The post's short service names are valid in same-namespace examples but could be made more explicit in a future editorial pass.
