# Validation Summary: Runbook: Calico Node Pod Evicted

## Status
validated

## Post Type
Runbook / Operational Guide

## Technologies Covered
- Calico (calico-node DaemonSet)
- Kubernetes (kubectl, DaemonSets, priority classes, node conditions, evictions)
- Linux system tools (journalctl, find, truncate, df, free, ssh)
- Container runtimes (crictl, docker)

## Sources Consulted
- Kubernetes documentation: Pod Priority and Preemption (https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/) — confirms `system-node-critical` is a built-in priority class (priority 2000001000) reserved for critical node-level workloads.
- Kubernetes documentation: Node-pressure Eviction (https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/) — confirms DiskPressure / MemoryPressure node conditions and eviction behavior.
- kubectl reference: `kubectl wait` (https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#wait) — confirms `--field-selector`, `--for=condition=Ready`, and `--timeout` flags.
- kubectl reference: `kubectl patch` with `--type=json` (RFC 6902 JSON Patch) — confirms patch operation/path/value syntax.
- Calico installation reference (manifest-based installs) — confirms DaemonSet name `calico-node`, namespace `kube-system`, and label `k8s-app=calico-node`.
- crictl documentation (https://github.com/kubernetes-sigs/cri-tools) — confirms `crictl rmi --prune` removes unused images.
- systemd-journald man page — confirms `journalctl --vacuum-size=200M` syntax.
- Docker CLI reference — confirms `docker system prune -f` syntax.

## Issues Found
No technical issues found.

## Review Notes
- The DaemonSet location (`kube-system` namespace, label `k8s-app=calico-node`) is correct for the manifest-based Calico installation. For Tigera Operator-based installs, the DaemonSet lives in the `calico-system` namespace and is managed by the `Installation` CR — direct `kubectl patch` on the DaemonSet would be reverted by the operator. The post implicitly targets the manifest-based install, which is a reasonable scope but could be worth noting in a future revision.
- `system-node-critical` reduces the probability of kubelet evicting the pod under node pressure but does not make eviction impossible under extreme conditions. The post's phrasing ("prevents the issue from recurring on the next pressure event") is a fair operational simplification.
- The `kubectl wait` command uses both `-l` (label selector) and `--field-selector`; both are supported and behave as expected.
- The heredoc `ssh <node-name> << 'EOF' ... EOF` block runs the wrapped commands on the remote node, which is the intended behavior.
