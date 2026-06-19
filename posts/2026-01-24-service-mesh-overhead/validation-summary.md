# Validation Summary: How to Fix 'Service Mesh Overhead' Issues

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- Istio
- Linkerd
- Prometheus
- Fortio
- Bash
- YAML

## Sources Consulted
- Istio Sidecar API reference: https://istio.io/latest/docs/reference/config/networking/sidecar/
- Istio resource annotations reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio sidecar injection documentation: https://istio.io/latest/docs/setup/additional-setup/sidecar-injection/
- Istio DestinationRule API reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio ServiceEntry API reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio egress traffic control documentation: https://istio.io/latest/docs/tasks/traffic-management/egress/egress-control/
- Linkerd proxy configuration reference: https://linkerd.io/2-edge/reference/proxy-configuration/
- Linkerd proxy concurrency and resource tuning documentation: https://linkerd.io/2-edge/tasks/configuring-proxy-concurrency/
- Linkerd install CLI reference: https://linkerd.io/2-edge/reference/cli/install/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes sidecar containers documentation: https://kubernetes.io/docs/concepts/workloads/pods/sidecar-containers/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands
- Prometheus histogram documentation: https://prometheus.io/docs/practices/histograms/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Fortio official repository documentation: https://github.com/fortio/fortio

## Issues Found
- Replaced deprecated Istio pod injection annotations with the current `sidecar.istio.io/inject` pod label form, matching Istio's sidecar injection documentation.
- Made the benchmark-with-mesh Deployment explicitly opt into injection instead of implying injection is always enabled by default.
- Added required `spec.selector.matchLabels` and matching pod template labels to Deployment snippets that declared `apps/v1` Deployments without selectors.
- Added a missing container spec to the `database-client` Deployment so the manifest is complete.
- Corrected the IstioOperator comment that incorrectly implied `enableCoreDump: false` enables Kubernetes native sidecars. It only keeps core dumps disabled unless debugging.
- Replaced the invalid Linkerd `kind: Link` proxy tuning example with supported namespace and pod-template annotations from the Linkerd proxy configuration reference.
- Moved Linkerd per-workload annotations into `spec.template.metadata.annotations`, where Linkerd documents auto-injected proxy overrides.
- Updated Istio traffic resources from `networking.istio.io/v1beta1` to the current `networking.istio.io/v1` API version used by the official references.
- Changed the external `ServiceEntry` comments so it is described as registering external services for controlled mesh access, not bypassing the proxy.
- Fixed Prometheus `histogram_quantile` examples to aggregate classic histogram buckets with `sum by (destination_service, le) (...)`, preserving the required `le` label.

## Review Notes
- YAML snippets were parsed successfully after edits.
- Bash snippets passed `bash -n`.
- The external TCP `ServiceEntry` is valid as an example, but Istio may warn that TCP ServiceEntries need `addresses` when IP auto-allocation is not enabled. Real deployments should verify this against their mesh configuration.
