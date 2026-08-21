# Validation Summary: When Flannel Pod IPs Work but ClusterIP Services Fail

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- Kubernetes Services and ClusterIP virtual IPs
- Kubernetes EndpointSlices, readiness, selectors, and traffic policies
- kube-proxy in iptables, nftables, and IPVS modes
- Flannel and the CNI bridge plugin
- Linux bridge hairpin mode, forwarding, and netfilter
- iptables, ip6tables, nftables, and IPVS
- firewalld runtime and permanent configuration
- Kubernetes Service DNS

## Sources Consulted

- [Kubernetes: Virtual IPs and Service Proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/)
- [Kubernetes Service concepts](https://kubernetes.io/docs/concepts/services-networking/service/)
- [Kubernetes Service Internal Traffic Policy](https://kubernetes.io/docs/concepts/services-networking/service-traffic-policy/)
- [Kubernetes EndpointSlice concepts](https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/)
- [Kubernetes EndpointSlice API](https://kubernetes.io/docs/reference/kubernetes-api/discovery/endpoint-slice-v1/)
- [Kubernetes Labels and Selectors](https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/)
- [Kubernetes DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/)
- [Kubernetes Debug Services](https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/)
- [Kubernetes kube-proxy configuration API](https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/)
- [Kubernetes kubeadm component customization](https://kubernetes.io/docs/setup/production-environment/tools/kubeadm/control-plane-flags/)
- [Kubernetes 1.36 kube-proxy server source](https://github.com/kubernetes/kubernetes/blob/release-1.36/cmd/kube-proxy/app/server.go)
- [Kubernetes 1.36 iptables proxier source](https://github.com/kubernetes/kubernetes/blob/release-1.36/pkg/proxy/iptables/proxier.go)
- [Kubernetes IPVS proxier documentation](https://github.com/kubernetes/kubernetes/blob/release-1.36/pkg/proxy/ipvs/README.md)
- [Flannel's current Kubernetes manifest](https://github.com/flannel-io/flannel/blob/master/Documentation/kube-flannel.yml)
- [Flannel configuration reference](https://github.com/flannel-io/flannel/blob/master/Documentation/configuration.md)
- [CNI bridge plugin documentation](https://www.cni.dev/plugins/current/main/bridge/)
- [CNI bridge plugin source](https://github.com/containernetworking/plugins/blob/main/plugins/main/bridge/bridge.go)
- [Linux bridge documentation](https://docs.kernel.org/networking/bridge.html)
- [Linux IP sysctl documentation](https://docs.kernel.org/networking/ip-sysctl.html)
- [firewalld runtime versus permanent configuration](https://firewalld.org/documentation/configuration/runtime-versus-permanent.html)
- [firewalld configuration reference](https://firewalld.org/documentation/man-pages/firewalld.conf.html)

## Issues Found

- The connectivity-test introduction said it extracted a ready endpoint, but the commands only extracted the Service IP and port and displayed EndpointSlices. The wording now accurately describes the commands.
- The HTTP and DNS example silently assumed an IPv4 address and the default `cluster.local` cluster domain. The example is now explicitly scoped to those assumptions so IPv6 literals are not presented in invalid URL form and custom cluster domains are not misdiagnosed.
- The selector check implied equality with the Pod's complete label map. It now states that every Service selector requirement must match; selected Pods may have additional labels.
- The EndpointSlice readiness guidance had the `publishNotReadyAddresses` behavior backwards and omitted the API rule that a missing `ready` value is interpreted as true. The readiness and named-target-port guidance now matches the EndpointSlice API semantics.
- The post said Service virtual IPs are not assigned to an interface. That is false for kube-proxy's IPVS mode, which binds them to the `kube-ipvs0` dummy interface. The route warning now distinguishes iptables/nftables handling from IPVS handling.
- The kube-proxy object names, label, ConfigMap, and key were presented as universal. They are kubeadm conventions, so the post now tells readers to adapt them for other distributions.
- `/proxyMode` was described as a health endpoint. It is served by kube-proxy's metrics listener, while `/healthz` is served by the separate health listener. The wording now distinguishes them.
- The iptables commands only inspect IPv4 and omitted the current `KUBE-PROXY-FIREWALL` chain. The post now directs IPv6 users to `ip6tables-save`, includes the current chain, and notes the corresponding IPv6 forwarding and bridge-netfilter settings.
- Kernel-rule commands run on the client node but reuse `CLUSTER_IP`, which may have been set in a different administrative shell. The post now tells readers to set it again in the node shell before inspecting rules.
- A backend calling a multi-endpoint Service does not deterministically exercise hairpin forwarding because kube-proxy can choose a different backend. The post now calls for a single-backend Service for the deterministic self-Service test.
- Hairpin mode was described in a way that could imply the kernel property is immutable after interface creation. It is mutable per port; the bridge CNI plugin sets it on the host-side veth during CNI setup. The corrected wording preserves the valid advice to recreate Pods after changing managed CNI configuration.
- The recovery commands could imply kube-proxy should always be restarted after any fix. The text now scopes that restart to cases where kube-proxy is the affected component.

## Review Notes

The overall troubleshooting sequence is technically sound. Kubernetes 1.36 is the current stable documentation set on the validation date. The post's version claims are correct: nftables mode is stable from Kubernetes 1.33 and requires Linux kernel 5.13 or later, while IPVS mode is deprecated as of Kubernetes 1.35 but remains available. `kubectl rollout status daemonset/kube-proxy` is a valid command, although it reports aggregate DaemonSet rollout status rather than specifically identifying the replacement Pod on the client node.
