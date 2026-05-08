# Validation Summary: Validate Service CIDR Reachability with Calico

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services and ClusterIP virtual IPs
- Kubernetes kube-proxy service proxy modes
- `kubectl` service inspection, pod execution, and node debugging
- Calico Open Source network policy
- Calico IP pools and BGP service IP advertisement
- Linux iptables and node routing diagnostics

## Sources Consulted
- Kubernetes documentation: Virtual IPs and Service Proxies, https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes documentation: Service ClusterIP allocation, https://kubernetes.io/docs/concepts/services-networking/cluster-ip-allocation/
- Kubernetes kubectl reference: `kubectl debug`, https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: Debugging Kubernetes Nodes With Kubectl, https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Calico documentation: GlobalNetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: BGPConfiguration resource, https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: Advertise Kubernetes service IP addresses, https://docs.tigera.io/calico/latest/networking/configuring/advertise-service-ips
- Calico documentation: Apply Calico policy to services exposed externally as cluster IPs, https://docs.tigera.io/calico/latest/network-policy/services/services-cluster-ips
- Calico documentation: About Calico eBPF, https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf

## Issues Found
- The introduction said ClusterIP addresses exist only in iptables or eBPF rules. Kubernetes also supports kube-proxy IPVS and nftables modes, so the wording was expanded to include service proxy rules such as iptables, IPVS, nftables, or Calico eBPF.
- The service CIDR discovery commands omitted the current ServiceCIDR API and described the kubeadm ConfigMap as a kube-controller-manager source. Added `kubectl get servicecidrs` and corrected the kubeadm comment.
- The service listing command included the table header and relied on column position. Replaced it with `kubectl get services --all-namespaces -o custom-columns=... --no-headers`.
- The pod connectivity test used HTTPS `wget` against the Kubernetes API service, which can fail because of certificate validation or authentication rather than service reachability. Replaced it with a TCP port check using BusyBox `nc`.
- The iptables inspection step implied all kube-proxy deployments use iptables. Updated the wording to apply specifically to kube-proxy iptables mode.
- The `kubectl debug node` iptables commands did not request privileges needed for netfilter inspection and used an image that may not contain iptables. Added `--profile=netadmin` and switched the examples to a troubleshooting image with networking tools.
- The Calico configuration check claimed Felix should know the service CIDR via the `calico-config` ConfigMap. Replaced it with the documented Calico BGPConfiguration `serviceClusterIPs` check, which is the relevant Calico setting when service IPs are advertised over BGP.
- The route check implied service CIDRs should always be handled by kube-proxy rather than BGP. Updated the wording to note that kube-proxy iptables mode normally does not require a node route, while still leaving the command useful for detecting unexpected routes.

## Review Notes
The guide is accurate as a troubleshooting workflow after the corrections. Future improvements could add separate command paths for kube-proxy IPVS and nftables modes, and explicit Calico eBPF map inspection commands for clusters running Calico as the kube-proxy replacement.
