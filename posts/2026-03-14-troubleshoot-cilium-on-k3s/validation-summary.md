# Validation Summary: Troubleshooting Cilium on K3s

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- K3s
- kube-proxy
- Flannel
- CoreDNS
- Hubble
- Linux eBPF/BPF
- iptables

## Sources Consulted
- Cilium Installation Using K3s: https://docs.cilium.io/en/stable/installation/k3s.html
- Cilium command reference for `cilium connectivity test`: https://docs.cilium.io/en/latest/cmdref/cilium_connectivity_test/
- Cilium command reference for `cilium config view`: https://docs.cilium.io/en/latest/cmdref/cilium_config.html
- Cilium command reference for `cilium-dbg endpoint list`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Cilium command reference for `cilium-dbg monitor`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor.html
- Cilium Endpoint CRD documentation: https://docs.cilium.io/en/latest/network/kubernetes/ciliumendpoint.html
- Cilium system requirements: https://docs.cilium.io/en/stable/operations/system_requirements.html
- Cilium Kubernetes without kube-proxy documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium Helm reference: https://docs.cilium.io/en/latest/helm-reference/
- K3s Basic Network Options: https://docs.k3s.io/networking/basic-network-options
- K3s Server CLI reference: https://docs.k3s.io/cli/server
- K3s Multus and IPAM plugins documentation for K3s CNI paths: https://docs.k3s.io/networking/multus-ipams

## Issues Found
- The post used `cilium endpoint list`, `cilium bpf tunnel list`, and `cilium monitor --type drop` as if they were current top-level Cilium CLI commands. Current Cilium troubleshooting commands inside the agent container use `cilium-dbg`, so these were changed to `cilium-dbg endpoint list`, `cilium-dbg bpf ipcache list`, and `cilium-dbg monitor --type drop`. The Kubernetes-wide endpoint check was changed to `kubectl get ciliumendpoints --all-namespaces`.
- The post referenced `/etc/cni/net.d/` as the K3s CNI configuration path. K3s commonly uses `/var/lib/rancher/k3s/agent/etc/cni/net.d/` for its agent CNI configuration, so cleanup and verification commands were updated to that path.
- The K3s reinstall example did not mention `--disable-kube-proxy` when Cilium is used with `kubeProxyReplacement=true`. A note was added because the official Cilium K3s installation guide calls this out.
- The post recommended a non-existent `cilium cleanup-kube-proxy` command. This was replaced with the official kube-proxy-free cleanup approach of deleting the DaemonSet and removing `KUBE` iptables rules on each node.
- The routing-mode check expected `tunnel=vxlan`. Current Cilium configuration uses routing and tunnel protocol terminology, so the command and expected output comment were changed to check `routing-mode` and `tunnel-protocol`.
- The validation command `cilium connectivity test --test pod-to-pod,pod-to-service,dns-resolution` was overly specific and did not match the official basic validation command. It was changed to `cilium connectivity test`.
- The Helm troubleshooting command for `k8sServiceHost` was incomplete for a typical kube-system Cilium release and omitted `k8sServicePort`. It now includes `-n kube-system --reuse-values` and sets both host and port.
- The kernel requirement note was outdated. It was updated from the older Cilium 1.13-era `4.19.57+` requirement to the current Cilium system requirement of Linux kernel 5.10+ or an equivalent distribution kernel such as RHEL 8.10's 4.18 kernel.
- The conclusion referred to `cilium monitor`; it now refers to the in-agent `cilium-dbg monitor` command.

## Review Notes
The guide is technically relevant and useful, but many diagnostics are inherently version-sensitive. Future updates should mention the target Cilium minor version explicitly because CLI layout and kernel requirements can change between Cilium releases.
