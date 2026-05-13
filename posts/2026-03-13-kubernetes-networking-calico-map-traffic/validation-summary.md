# Validation Summary: How to Map Kubernetes Networking for Calico Users to Real Kubernetes Traffic

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Services and DNS
- kube-proxy iptables mode
- Calico Open Source
- Calico Felix
- Calico VXLAN overlay networking
- Calico eBPF dataplane
- Linux routing, veth interfaces, iptables, and NAT

## Sources Consulted
- Kubernetes DNS for Services and Pods: https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/
- Kubernetes Virtual IPs and Service Proxies: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes Using Source IP: https://kubernetes.io/docs/tutorials/services/source-ip/
- Calico data path architecture: https://docs.tigera.io/calico/latest/reference/architecture/data-path
- Calico overlay networking: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico IPPool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico outgoing NAT documentation: https://docs.tigera.io/calico/latest/networking/configuring/workloads-outside-cluster
- Calico eBPF troubleshooting: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Project Calico issue examples showing the `cali-nat-outgoing` chain: https://github.com/projectcalico/calico/issues/2222

## Issues Found
- The DNS scenario implied that Calico alone handles routing to the CoreDNS pod through service routing. Updated the text to clarify that kube-proxy or Calico eBPF handles the kube-dns ClusterIP Service translation, then Calico routes to the selected CoreDNS pod.
- The DNS return path was described only as conntrack routing. Updated it to describe service reverse NAT plus normal pod routing.
- The ClusterIP Service diagram showed SNAT on the return path. Kubernetes iptables mode preserves the client source IP for ClusterIP traffic and uses reverse NAT/conntrack for the response, so the diagram now says reverse NAT.
- The Calico eBPF verification command used a raw `bpftool` map name. Replaced it with the official Calico troubleshooting command, `calico-node -bpf nat dump`, run from a `calico-node` pod.
- The outgoing NAT section said traffic is NATed when destined outside the cluster CIDR and specifically from an RFC 1918 pod IP to the node's external IP. Calico documents `natOutgoing` as applying to traffic destined outside Calico IP pools and changing the pod source IP to the node IP, so the wording was corrected.
- The outgoing NAT verification command referenced `CALICO-MASQ`, which is not the current Calico chain name shown in Calico examples. Updated it to inspect `cali-nat-outgoing`.

## Review Notes
The post is version-agnostic. The corrected eBPF command assumes Calico's standard `calico-system` namespace; clusters installed into a different namespace should adjust the namespace and pod name accordingly.
