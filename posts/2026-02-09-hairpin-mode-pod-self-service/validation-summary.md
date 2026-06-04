# Validation Summary: How to implement hairpin mode for pod-to-self via service

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes Services and kube-proxy
- Kubernetes kubelet hairpin mode
- CNI bridge plugin
- Flannel CNI
- Calico networking
- Linux bridge, iptables, conntrack, tcpdump, and IPVS
- Headless Services and Kubernetes DNS

## Sources Consulted
- Kubernetes Debug Services documentation: https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Kubernetes kubelet configuration API: https://kubernetes.io/docs/reference/config-api/kubelet-config.v1beta1/
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kube-proxy configuration API: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes Service documentation, including headless Services: https://kubernetes.io/docs/concepts/services-networking/service/
- CNI bridge plugin documentation: https://www.cni.dev/plugins/current/main/bridge/
- CNI specification: https://www.cni.dev/docs/spec/
- Flannel upstream Kubernetes manifest: https://github.com/flannel-io/flannel
- Calico FelixConfiguration documentation: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico eBPF Service handling documentation: https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Local CLI help for `ip link`, `bridge`, `kubectl rollout restart`, and `kubectl drain`

## Issues Found
- The opening explanation said pod-to-self Service traffic fails unconditionally without hairpin mode. Updated it to clarify that failure occurs when kube-proxy selects the calling pod as the backend, especially on bridge-backed pod networks.
- The NAT explanation incorrectly said the pod sees traffic as coming from the Service IP. Reworded it to describe kube-proxy DNAT and hairpin SNAT more accurately.
- The bridge CNI example used `cniVersion: "0.4.0"` and saved a single plugin configuration as `.conflist`. Updated the example to current `cniVersion: "1.0.0"` and changed the filename to `.conf`.
- Bridge verification commands grepped broad `bridge link show` output. Updated them to use `bridge link show master cni0` and per-interface sysfs checks.
- The Calico section incorrectly claimed `ipipEnabled` and `chainInsertMode` enable hairpin behavior. Replaced that with kubelet hairpin and kube-proxy NAT checks, and noted that those Felix settings do not enable pod-to-self Service hairpin NAT.
- The test Deployment used the old `nginx:1.21` image tag. Updated it to `nginx:stable`.
- The debugging command `bridge link show | grep hairpin` would not reliably show hairpin state. Updated it to `bridge -d link show | grep hairpin`.
- The tcpdump example tried to find a host veth by grepping the pod IP in `ip a`, which is unreliable because the pod IP is normally inside the pod network namespace. Updated it to capture on `cni0`.
- The IPVS section claimed hairpin behavior is built in and always works without bridge-level configuration. Updated it to explain what IPVS does, note that bridge-backed pod networks may still need kubelet/CNI hairpin settings, and note that Kubernetes marks IPVS mode as deprecated as of v1.35.

## Review Notes
The corrected post is technically valid as a Kubernetes networking guide. Future improvements could add a short note about nftables kube-proxy mode, which Kubernetes now recommends as the scalable Linux replacement for IPVS where supported.
