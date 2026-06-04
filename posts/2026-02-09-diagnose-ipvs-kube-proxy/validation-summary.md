# Validation Summary: How to diagnose IPVS mode kube-proxy issues

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Kubernetes
- kube-proxy
- IPVS
- ipvsadm
- Linux kernel netfilter and conntrack
- EndpointSlices
- NodePort and ClusterIP Services
- bpftrace

## Sources Consulted
- Kubernetes Virtual IPs and Service Proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes kube-proxy command reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Kubernetes kube-proxy configuration API reference: https://kubernetes.io/docs/reference/config-api/kube-proxy-config.v1alpha1/
- Kubernetes IPVS-based in-cluster load balancing deep dive: https://kubernetes.io/blog/2018/07/09/ipvs-based-in-cluster-load-balancing-deep-dive/
- Ubuntu ipvsadm man page: https://manpages.ubuntu.com/manpages/noble/man8/ipvsadm.8.html
- Linux kernel nf_conntrack sysctl documentation: https://www.kernel.org/doc/html/latest/networking/nf_conntrack-sysctl.html

## Issues Found
- The post described IPVS as generally better than iptables without noting current Kubernetes status. Updated the wording to say IPVS was introduced for better rule-sync performance and throughput, and noted that Kubernetes v1.35 deprecates IPVS mode in favor of nftables mode.
- The post said kube-proxy falls back to iptables when IPVS modules are missing. Current Kubernetes documentation says kube-proxy exits with an error if IPVS modules are unavailable, so the text was corrected.
- The service backend check only used the legacy Endpoints resource. Added an EndpointSlice command because modern kube-proxy watches EndpointSlices as well.
- The post implied every Service has exactly one IPVS virtual server with pod IPs. Updated this to account for Services that produce multiple virtual servers and for endpoint IPs more generally.
- The conntrack section stated that IPVS itself uses connection tracking. Refined this to explain that IPVS-mode Service traffic can still depend on netfilter conntrack for NAT and masquerade behavior.
- The scheduler options list was incomplete. Added the additional documented IPVS schedulers including weighted, locality-based, and Maglev options.
- The `ipvsadm --stats` column description was incorrect. Replaced the `ActiveConn` / `InActConn` description with the statistics columns `Conns`, `InPkts`, `OutPkts`, `InBytes`, and `OutBytes`.
- The session affinity section used `ipvsadm -L -n -p` and suggested `ipvsadm -C` to clear persistence. `-p` is not the correct list option, and `ipvsadm -C` clears all IPVS configuration. Replaced those commands with `--persistent-conn` inspection commands.
- The NodePort example checked every Kubernetes node IP from a single node. Updated it to check local node IPs on each node where the NodePort should be accepted.
- The monitoring script used `grep -c "->"`, which can be parsed as an option-like pattern, and its awk logic could not report Services with no backends. Added `grep --`, SCTP support, and corrected the awk bookkeeping.
- The kube-proxy ConfigMap example embedded an incomplete config body. Added `apiVersion: kubeproxy.config.k8s.io/v1alpha1` and `kind: KubeProxyConfiguration`, and changed the label from "optimal" to "example" because `strictARP: true` is environment-specific.

## Review Notes
IPVS mode remains useful to troubleshoot in existing clusters, but it is deprecated in current Kubernetes documentation. Future revisions should consider adding a short migration note for nftables mode, but that would be a content expansion beyond this validation pass.
