# Validation Summary: Runbook: Calico Node Not Ready Status

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (Kubernetes CNI)
- Kubernetes (kubectl, DaemonSets, nodes, pods, PriorityClass)
- kubelet (systemd service)
- Mermaid (diagram syntax)
- Bash shell scripting

## Sources Consulted
- Calico documentation: https://docs.tigera.io/calico/latest/reference/installation/k8s-component-versions and https://docs.tigera.io/calico/latest/operations/troubleshoot/
- kubectl reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#wait and `kubectl wait` documentation
- Kubernetes field selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors/
- Kubernetes PriorityClass: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/#priorityclass (system-node-critical is a built-in critical priority class)
- Kubernetes node conditions / NotReady: https://kubernetes.io/docs/concepts/architecture/nodes/#condition
- Mermaid flowchart syntax: https://mermaid.js.org/syntax/flowchart.html (the `D & E & F --> G` multi-source join is supported)

## Issues Found
No technical issues found.

Verified items:
- `k8s-app=calico-node` is the correct standard label for Calico DaemonSet pods.
- `spec.nodeName` is a valid field selector for pods.
- `kubectl wait` supports `-l`, `--field-selector`, `--for=condition=Ready`, and `--timeout` flags.
- `kubectl get pods -o name` outputs `pod/<name>` which is valid input to subsequent `kubectl describe`/`logs` invocations.
- `system-node-critical` is a real, built-in PriorityClass intended for node-critical add-ons like CNI agents.
- The remediation chain (restart pod → wait → restart kubelet) reflects standard practice for recovering a node whose readiness is gated on CNI health.

## Review Notes
- For Calico installations that use the Tigera operator (rather than manifest-based), pods may be in the `calico-system` namespace with different labels (e.g., `k8s-app=calico-node` still applies in most cases). The runbook assumes manifest-based installation in `kube-system`, which is the most common case. Operators of operator-managed clusters may need to adjust the namespace.
- `kubectl logs <pod>` on a calico-node pod works because there is typically a single main container; init containers (`install-cni`, `mount-bpffs`, `upgrade-ipam`) are completed and not returned by default. If a cluster uses a custom Calico configuration with multiple long-running sidecars, `-c calico-node` would be needed.
- The `ssh $NODE "..."` step assumes `$NODE` (the Kubernetes node name) is resolvable as an SSH host; in some environments the SSH host differs from the Kubernetes node name and operators may need to translate.
