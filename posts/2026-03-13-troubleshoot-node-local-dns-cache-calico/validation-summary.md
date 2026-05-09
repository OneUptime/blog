# Validation Summary: How to Troubleshoot Node Local DNS Cache with Calico

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Kubernetes
- NodeLocal DNSCache
- CoreDNS/kube-dns
- Calico GlobalNetworkPolicy
- kubectl
- iptables

## Sources Consulted
- Kubernetes documentation: Using NodeLocal DNSCache in Kubernetes Clusters - https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns/
- Kubernetes documentation: kubectl run reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes documentation: Debug Services - https://kubernetes.io/docs/tasks/debug/debug-application/debug-service/
- Calico documentation: Global network policy resource - https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: Get started with Calico network policy - https://docs.tigera.io/calico/latest/network-policy/get-started/calico-policy/calico-network-policy

## Issues Found
- The introduction said a failed NodeLocal DNSCache pod causes DNS resolution failures for all pods on the affected node. This was too absolute because only pods that depend on the cache path are affected. Changed the wording to "can cause" failures for pods that depend on it.
- The introduction described the cache "falling back to CoreDNS" as a failure mode. NodeLocal DNSCache normally forwards cache misses and upstream queries to kube-dns/CoreDNS, so the failure mode is forwarding connectivity failure, not fallback. Updated the wording accordingly.
- The `resolv.conf` section said it should always show `nameserver 169.254.20.10` and that seeing the kube-dns ClusterIP means NodeLocal DNS is inactive. Kubernetes documents that in iptables mode NodeLocal DNSCache listens on both the kube-dns service IP and the local DNS address, while IPVS mode requires kubelet `--cluster-dns` to use the local address. Updated the comments to reflect both modes.
- The Calico diagnosis section used `ping` to test reachability to the NodeLocal DNSCache address. ICMP reachability does not validate whether DNS traffic on TCP/UDP port 53 is allowed or served. Replaced it with a direct `nslookup` against `169.254.20.10`.

## Review Notes
The Calico GlobalNetworkPolicy example is syntactically valid for Calico Open Source and correctly allows TCP/UDP destination port 53 to the NodeLocal DNSCache address. In real clusters, policy order and tiering still matter; a higher-priority deny policy can override this example.
