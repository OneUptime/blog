# Validation Summary: How to Implement Canary Deployments Using Weighted Service Routing in Kubernetes

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Kubernetes Deployments and Services
- kubectl rollout, scale, set image, and patch commands
- Istio VirtualService and DestinationRule traffic routing
- Prometheus and PromQL
- Python Kubernetes client

## Sources Consulted
- Kubernetes Services documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Labels and Selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Traffic Management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Prometheus histogram best practices: https://prometheus.io/docs/practices/histograms/
- Prometheus histogram_quantile function reference: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile
- Prometheus operators and vector matching reference: https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The progressive rollout script forced at least one stable replica at every stage, so the 100% canary step could not actually route all replica-based traffic to the canary. Updated the math to allow zero stable replicas at 100% and to calculate the total from the current stable and canary replica counts.
- The progressive rollout script called an undefined `check_error_rate` function, so the example would fail under `set -e` unless the reader added one. Added a small placeholder function that readers can replace with their metrics implementation.
- The Python Prometheus error-rate query divided per-status 5xx series by all request series without aggregation, which can produce incorrect results because Prometheus binary operators match vectors by label sets. Updated the query to use `sum(rate(...))` for numerator and denominator.
- The Python p99 latency query used `histogram_quantile()` directly over bucket rates. That can work per full label set, but it does not aggregate pods or instances for the selected version. Updated it to `sum by (le) (rate(..._bucket[5m]))`, matching Prometheus guidance for classic histograms.
- The alert PromQL had the same error-rate and histogram aggregation issues as the Python example. Updated both alert expressions to aggregate request rates and histogram buckets correctly.

## Review Notes
The Kubernetes and Istio API versions used in the examples are current and technically valid. Replica-count canaries remain approximate because Kubernetes Services route over ready endpoints rather than enforcing exact percentages; the post already describes this as approximate. `kubectl` was not installed in the local environment, so CLI command validation was performed against the official Kubernetes kubectl reference.
