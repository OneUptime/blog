# Validation Summary: Cilium HostPort Support

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium
- Kubernetes
- HostPort
- eBPF
- Helm
- iptables

## Sources Consulted
- Cilium Kubernetes Without kube-proxy: Container HostPort Support: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Portmap (HostPort) CNI chaining documentation: https://docs.cilium.io/en/stable/installation/cni-chaining-portmap.html
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-reference/
- Cilium CLI reference for `cilium-dbg service list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_service_list.html
- Cilium CLI reference for `cilium-dbg bpf lb list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bpf_lb_list.html
- Cilium CLI reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Kubernetes API reference for container ports and HostPort fields: https://kubernetes.io/docs/reference/generated/kubernetes-api/

## Issues Found
- The post described HostPort as being implemented by kube-proxy in standard Kubernetes. Updated this to state that HostPort support depends on the container runtime or CNI plugin, with common implementations using iptables DNAT rules.
- The post claimed Cilium HostPort is always implemented natively with eBPF and listed `hostPort.enabled=true` as a standalone Helm option. Current Cilium documentation ties native eBPF HostPort support to `kubeProxyReplacement=true`; for `kubeProxyReplacement=false`, Cilium documents `cni.chainingMode=portmap` instead. Updated the prerequisites and Helm example accordingly.
- The post used older or ambiguous Cilium CLI commands such as `cilium service list`, `cilium bpf lb list`, and `cilium monitor` from unclear execution contexts. Updated the examples to run current documented `cilium-dbg` commands through `kubectl -n kube-system exec ds/cilium --`.
- The DaemonSet manifest targeted the `monitoring` namespace but did not create it. Added a minimal Namespace object to make the YAML apply cleanly.
- The node IP lookup used `.status.addresses[0].address`, which can select the wrong address type depending on Kubernetes node status ordering. Updated it to select the `InternalIP` address explicitly.
- The iptables validation command was adjusted to match Cilium's documented `iptables-save | grep HOSTPORT` verification pattern for native eBPF HostPort.

## Review Notes
- The guide is accurate for Cilium's native eBPF HostPort path when kube-proxy replacement is enabled. The portmap CNI fallback is not Cilium's native eBPF HostPort implementation and may use iptables depending on the portmap plugin behavior.
- The example assumes a `worker-0` node and a `test-pod` already exist. Those assumptions are acceptable for a concise guide but could be made more self-contained in a future revision.
