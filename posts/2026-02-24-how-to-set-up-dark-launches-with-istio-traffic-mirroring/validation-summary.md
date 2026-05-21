# Validation Summary: How to Set Up Dark Launches with Istio Traffic Mirroring

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Istio VirtualService
- Istio DestinationRule
- Istio traffic mirroring
- Kubernetes Deployments and Services
- kubectl logs
- Prometheus and PromQL
- Python request handling

## Sources Consulted
- Istio traffic mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus histogram_quantile documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/#histogram_quantile

## Issues Found
- Updated Istio `VirtualService` and `DestinationRule` examples from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` API version used by current Istio documentation.
- Changed the risk wording from "without any risk" to "with much less user-facing risk" because mirrored requests can still create backend side effects, external calls, and added load.
- Clarified the "fire-and-forget" wording so it matches Istio's documented best-effort behavior: the proxy does not wait for the mirrored destination before returning the primary response.
- Corrected the header wording from only `Host` to `Host` or `Authority`, matching Istio's traffic mirroring documentation.
- Fixed the Prometheus percentile queries to aggregate classic histogram buckets with `sum by (le)` before calling `histogram_quantile()`.

## Review Notes
The Kubernetes manifests, subset routing model, `mirror` and `mirrorPercentage` fields, kubectl log commands, and the stateful-operation caveats are technically sound. The post intentionally uses short Kubernetes service names, which Istio supports, but fully qualified service names are safer in multi-namespace examples.
