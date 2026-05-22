# Validation Summary: How to Configure Anti-Affinity Rules for Istio Components

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio
- IstioOperator
- Kubernetes scheduling
- Kubernetes pod affinity and anti-affinity
- Kubernetes topology spread constraints
- Kubernetes node affinity
- Kubernetes taints and tolerations
- kubectl

## Sources Consulted
- Kubernetes documentation: Assigning Pods to Nodes - https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes documentation: Pod Topology Spread Constraints - https://kubernetes.io/docs/concepts/scheduling-eviction/topology-spread-constraints/
- Kubernetes documentation: Node Labels Populated By The Kubelet - https://kubernetes.io/docs/reference/node/node-labels/
- Kubernetes documentation: Well-Known Labels, Annotations and Taints - https://kubernetes.io/docs/reference/labels-annotations-taints/
- Kubernetes documentation: Deployments - https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes documentation: Taints and Tolerations - https://kubernetes.io/docs/concepts/scheduling-eviction/taint-and-toleration/
- Kubernetes kubectl reference: kubectl taint - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_taint/
- Istio documentation: IstioOperator Options - https://istio.io/latest/docs/reference/config/istio.operator.v1alpha1/

## Issues Found
- The guide claimed it covered every Istio component, but current Istio installations can include additional components such as CNI and ztunnel. Changed the wording to common control plane and gateway components.
- The soft anti-affinity explanation said pods always get scheduled. Preferred anti-affinity does not block scheduling, but other scheduling constraints can still leave pods pending. Updated the wording to include that caveat.
- The hard zone anti-affinity examples used `requiredDuringSchedulingIgnoredDuringExecution` with `topology.kubernetes.io/zone`. Kubernetes documents that the `LimitPodHardAntiAffinityTopology` admission controller can limit hard pod anti-affinity topology keys to `kubernetes.io/hostname`. Added caveats that zone-level hard anti-affinity depends on cluster admission configuration.
- The application Deployment example omitted `.spec.selector`, which is required for `apps/v1` Deployments and must match the Pod template labels. Added `selector.matchLabels`.
- The dedicated-node section said taints ensure the nodes only run Istio components. Taints only repel pods without matching tolerations; any pod with a matching toleration can still schedule there. Updated the explanation.
- The verification command tried to read `topology.kubernetes.io/zone` from Pod metadata labels. Zone labels are node labels, so the command was changed to list node zone labels and compare them with the Pod node placement.
- The HPA note referred specifically to zones/nodes when the same scheduling issue applies to whichever topology domain the hard anti-affinity rule uses. Generalized the wording to topology domains.
- The summary recommended zone-level hard anti-affinity without the admission-controller caveat. Updated it to recommend zone-level spreading preferences and to mention the hard anti-affinity topology-key requirement.

## Review Notes
The IstioOperator fields used in the examples (`components`, `pilot`, gateway specs, `k8s.affinity`, `replicaCount`, `tolerations`, and `overlays`) are present in the current IstioOperator reference. The Kubernetes affinity, topology spread constraint, taint, toleration, and kubectl command syntax is otherwise consistent with official documentation. `kubectl` is not installed in the local workspace, so CLI verification was performed against official Kubernetes command documentation rather than local `--help` output.
