# Validation Summary: How to Handle Node-Level Issues in Ambient Mode

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio ambient mode
- Istio ztunnel
- Istio CNI node agent
- Kubernetes DaemonSets
- Kubernetes node debugging
- Kubernetes pod priority and eviction
- iptables and nftables

## Sources Consulted
- Istio ambient overview: https://istio.io/latest/docs/ambient/overview/
- Istio ambient ztunnel traffic redirection: https://istio.io/latest/docs/ambient/architecture/traffic-redirection/
- Istio CNI node agent installation and operation: https://istio.io/latest/docs/setup/additional-setup/cni/
- Istio CNI troubleshooting: https://istio.io/latest/docs/ops/diagnostic-tools/cni/
- Istio platform requirements: https://istio.io/latest/docs/ops/deployment/platform-requirements/
- Istio ambient platform prerequisites: https://istio.io/latest/docs/ambient/install/platform-prerequisites/
- Istio ztunnel troubleshooting: https://istio.io/latest/docs/ambient/usage/troubleshoot-ztunnel/
- Istio istioctl command reference for `ztunnel-config log`: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes `kubectl debug` reference and node debugging docs: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/ and https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl drain` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_drain/
- Kubernetes PriorityClass and node-pressure eviction docs: https://kubernetes.io/docs/concepts/scheduling-eviction/pod-priority-preemption/ and https://kubernetes.io/docs/concepts/scheduling-eviction/node-pressure-eviction/

## Issues Found
- `kubectl debug node` host filesystem paths were incorrect. Kubernetes mounts the host root at `/host` inside node debug pods, so checks for CNI binaries and config files were changed to `/host/opt/cni/bin/istio-cni` and `/host/etc/cni/net.d/`.
- The kernel version section claimed a general Linux 4.19 requirement and mentioned eBPF-specific version requirements. Current Istio documentation describes required kernel modules for the default `iptables` backend and Linux 5.13 plus `nft` 1.0.1 or later for native `nftables`, so the section was corrected to kernel module compatibility.
- The backend configuration snippet used `values.cni.ambient.redirectMode: iptables`, which is not the current native nftables configuration path. It was replaced with `values.global.nativeNftables: true` and clarified that `iptables` is the default.
- The OOMKilled check used `kubectl describe pod` with `--field-selector`, which is not supported by `kubectl describe`. It now gets the ztunnel pod with `kubectl get pods --field-selector` and describes the named pod.
- The priority class snippet implied users should set `priorityClassName` through values. Current Istio charts set `system-node-critical` for ztunnel and the CNI DaemonSet, so this was changed to verification commands and corrected wording about eviction protection.
- The ztunnel runtime log-level command used an Envoy-style `localhost:15000/logging` endpoint. Current ztunnel logging is managed with `istioctl ztunnel-config log`, so the command was updated.
- The checklist used `kubectl logs` with `--field-selector`, which is not a supported `kubectl logs` option. It now resolves pod names with `kubectl get pods --field-selector` and then runs `kubectl logs` against the specific pod.

## Review Notes
Local `kubectl` was not installed in the review environment, so command validation was performed against the official Kubernetes command reference rather than local `--help` output. The guide assumes Istio is installed in `istio-system`; some platforms, such as OpenShift or certain GKE setups, may require `ztunnel` or `istio-cni` to run in another namespace according to Istio platform prerequisites.
