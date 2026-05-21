# Validation Summary: How to Handle Rolling Update Drain in Istio

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Deployments
- Kubernetes PodDisruptionBudgets
- Kubernetes lifecycle hooks and rolling updates
- Istio sidecar proxy configuration
- Istio VirtualService retries
- Istio DestinationRule connection pools and outlier detection
- Istio standard telemetry metrics
- Envoy retry policies
- Prometheus promtool

## Sources Consulted
- Kubernetes Deployment rolling update documentation: https://kubernetes.io/docs/tasks/run-application/update-deployment-rolling/
- Kubernetes Deployment API concepts: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Pod disruption documentation: https://kubernetes.io/docs/concepts/workloads/pods/disruptions/
- Kubernetes PodDisruptionBudget documentation: https://kubernetes.io/docs/tasks/run-application/configure-pdb/
- Kubernetes kubectl set image reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_image/
- Kubernetes kubectl rollout undo reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/kubectl_rollout_undo/
- Istio proxy.istio.io/config annotation reference: https://istio.io/latest/docs/reference/config/annotations/
- Istio MeshConfig ProxyConfig reference: https://istio.io/latest/docs/reference/config/istio.mesh.v1alpha1/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Envoy router retry policy documentation: https://www.envoyproxy.io/docs/envoy/latest/configuration/http/http_filters/router_filter.html
- Prometheus promtool command reference: https://prometheus.io/docs/prometheus/latest/command-line/promtool/

## Issues Found
- The Deployment manifest was invalid for `apps/v1` because it omitted the required `.spec.selector` and did not label the pod template. Added `selector.matchLabels.app: web-api` and matching `template.metadata.labels`.
- The PDB section incorrectly said a PDB protects against rolling updates and involuntary node failures. Updated the text to say PDBs limit eviction-based voluntary disruptions such as `kubectl drain`; involuntary disruptions only count against the budget, and Deployments are not limited by PDBs during rolling updates.
- The retry explanation described `refused-stream` as handling HTTP/2 GOAWAY responses. Updated it to the Envoy-documented behavior: retrying streams reset with the `REFUSED_STREAM` error code.
- The canary section implied that traffic shifting itself performs pod drain. Updated it to clarify that Istio routes new requests according to weights, while pod drain still occurs when pods are removed or replaced.

## Review Notes
The local environment did not have `kubectl` or `promtool` installed, so CLI syntax was verified against official generated Kubernetes and Prometheus documentation rather than local `--help` output. The automated rollback shell script is illustrative and assumes GNU `grep -P`, `bc`, access to Prometheus from inside the Prometheus pod, and a query result shape that returns a single numeric series.
