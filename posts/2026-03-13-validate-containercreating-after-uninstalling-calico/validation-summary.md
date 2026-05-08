# Validation Summary: How to Validate Resolution of ContainerCreating After Uninstalling Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- kubectl
- Container Network Interface (CNI)
- Calico
- BusyBox test pods
- SSH-based node inspection

## Sources Consulted
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes kubectl delete reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_delete/
- Kubernetes Network Plugins documentation: https://kubernetes.io/docs/concepts/extend-kubernetes/compute-storage-net/network-plugins/
- Kubernetes Assigning Pods to Nodes documentation: https://kubernetes.io/docs/concepts/scheduling-eviction/assign-pod-node/
- Kubernetes Pod Lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/

## Issues Found
- The node-by-node test used `kubectl wait pods -l run` and `kubectl delete pods -l run`, which could match and delete unrelated pods created with the default `kubectl run` label. Changed the test pods to use a dedicated `cni-validation=true` label and scoped wait/get/delete commands to that label.
- The node-by-node test used `sleep 10`, which could allow BusyBox pods to complete before `kubectl wait` observes them as Ready, especially on slow image pulls. Changed the test pods to `sleep 300` and kept cleanup immediately after validation.
- The `kubectl run --overrides` examples omitted `apiVersion`, which the official `kubectl run` reference expects for inline override objects. Added `apiVersion: v1` to each override.
- The cross-node connectivity test created `src` and `dst` without node placement, so both pods could land on the same node and not validate cross-node networking. Changed the snippet to select two node names and set `spec.nodeName` for each pod, with a guard for single-node clusters.

## Review Notes
The SSH-based CNI configuration check assumes node names are SSH-resolvable and that the operator has direct SSH access to each node. That is environment-dependent but technically reasonable for a troubleshooting checklist. The cross-node ping test can still be affected by cluster NetworkPolicies or environments where ICMP is intentionally blocked.
