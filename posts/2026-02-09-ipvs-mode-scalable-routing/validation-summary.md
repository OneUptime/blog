# Validation Summary: How to Implement IPVS Mode kube-proxy for Scalable Service Routing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes kube-proxy
- Kubernetes Services, NodePort, EndpointSlices, and session affinity
- Linux IPVS
- ipvsadm
- Linux conntrack and sysctl
- MetalLB
- Prometheus Operator ServiceMonitor

## Sources Consulted
- Kubernetes documentation: Virtual IPs and Service Proxies, including IPVS, iptables, nftables, scheduler behavior, and session affinity: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kube-proxy config API v1alpha1, including `KubeProxyIPVSConfiguration`, `KubeProxyConntrackConfiguration`, and proxy mode behavior: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes IPVS-based in-cluster load balancing deep dive, including IPVS modules and use of iptables/ipset with IPVS proxier: https://kubernetes.io/blog/2018/07/09/ipvs-based-in-cluster-load-balancing-deep-dive/
- MetalLB installation documentation, including strict ARP guidance for IPVS mode and current manifest URLs: https://metallb.io/installation/
- Linux kernel IPVS sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ipvs-sysctl.html
- Linux kernel netfilter conntrack sysctl documentation: https://docs.kernel.org/5.17/networking/nf_conntrack-sysctl.html
- ipvsadm manual page, including `--connection`, `--persistent-conn`, `--stats`, `--rate`, and `--set`: https://www.mankier.com/8/ipvsadm

## Issues Found
- The post presented IPVS as the clear production choice over iptables. Current Kubernetes documentation marks IPVS proxy mode deprecated as of Kubernetes v1.35 and recommends nftables mode where available. Updated the introduction, performance discussion, best practices, and conclusion to make IPVS an option for existing or older-kernel clusters rather than an unconditional recommendation.
- The prerequisite module list omitted `ip_vs_lc` even though the post demonstrates the `lc` scheduler. Added `ip_vs_lc` to the `modprobe` commands and boot-time module list.
- The source hashing section described `sh` as sticky sessions without `sessionAffinity` overhead. Updated it to describe source-IP-based distribution, while keeping Kubernetes `sessionAffinity: ClientIP` as the accurate Service-level affinity mechanism.
- The weighted round robin section implied kube-proxy can assign different backend capacities through Kubernetes Service endpoints. Clarified that `wrr` is a valid IPVS scheduler, but kube-proxy normally programs Service endpoints with equal weights.
- The performance example used precise latency numbers without a verifiable source. Replaced the hard numbers with documented qualitative behavior: IPVS has better rule synchronization and throughput than iptables in large clusters, while nftables should be considered for new clusters.
- The session affinity text said IPVS uses kernel connection tracking for persistence. Updated it to refer to IPVS persistence templates and connection entries, with conntrack treated separately as optional integration for stateful firewall rules.
- The troubleshooting section referred only to Endpoints. Added EndpointSlices, which are the current scalable Kubernetes endpoint API.
- The MetalLB manifest URL used v0.13.12. Updated it to the current MetalLB documentation's v0.16.1 native manifest URL.
- The monitoring and tuning commands referenced non-current or incorrect IPVS sysctls such as `net.ipv4.vs.conn_tab_size`, `timeout_established`, and `timeout_close`. Replaced them with `wc -l /proc/net/ip_vs_conn`, `ipvsadm --set`, and module-load-time `ip_vs conn_tab_bits` guidance.
- The command for listing IPVS sysctl values used `grep ipvs`, which may miss `net.ipv4.vs.*` keys. Updated it to `grep net.ipv4.vs`.

## Review Notes
The kube-proxy configuration fields shown in the post are valid for the documented `kubeproxy.config.k8s.io/v1alpha1` API, including `ipvs.scheduler`, `strictARP`, IPVS timeout fields, conntrack fields, and iptables masquerade settings. The ServiceMonitor example is structurally valid for Prometheus Operator, but a real cluster must expose kube-proxy metrics through a Service whose labels and port name match the selector.
