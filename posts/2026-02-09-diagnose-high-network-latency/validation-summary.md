# Validation Summary: How to Diagnose High Network Latency Between Pods

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes
- kubectl
- Kubernetes Services, EndpointSlices, NetworkPolicy, pod affinity, kube-proxy
- CNI plugins including Calico, Cilium, Flannel, and Weave
- CoreDNS and NodeLocal DNSCache
- Linux networking tools including ping, traceroute, tcptraceroute, iperf3, mtr, tcpdump, tshark, ethtool, iftop, sar, and bpftrace
- Prometheus Blackbox Exporter and Grafana

## Sources Consulted
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl exec reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes kubectl cp reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_cp/
- Kubernetes kubectl top node reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/
- Kubernetes EndpointSlice documentation: https://kubernetes.io/docs/concepts/services-networking/endpoint-slices/
- Kubernetes Service and Endpoints deprecation documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes kube-proxy virtual IPs and Service proxies documentation: https://kubernetes.io/docs/reference/networking/virtual-ips/
- Kubernetes NodeLocal DNSCache documentation: https://kubernetes.io/docs/tasks/administer-cluster/nodelocaldns
- CoreDNS Prometheus metrics documentation: https://coredns.io/plugins/metrics
- Cilium routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Calico overlay networking documentation: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico MTU documentation: https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Prometheus Blackbox Exporter documentation: https://github.com/prometheus/blackbox_exporter
- nicolaka/netshoot documentation: https://github.com/nicolaka/netshoot

## Issues Found
- The TCP retransmission example copied from the default container and used `tcpdump | grep retransmission`, but plain tcpdump output does not perform Wireshark-style TCP retransmission analysis. I named the debug container, copied from that container with `kubectl cp -c debugger`, and changed the analysis command to `tshark -r capture.pcap -Y 'tcp.analysis.retransmission'`.
- The service load-balancing section used the deprecated `Endpoints` API. I updated it to use `EndpointSlice` resources selected with the `kubernetes.io/service-name` label.
- The network congestion section implied `kubectl top nodes` monitors network utilization. I added a note that it reports CPU and memory, not interface bandwidth, leaving `iftop` and `sar -n DEV` as the network-specific checks.
- The iptables performance section recommended switching to IPVS. Current Kubernetes documentation makes `nftables` stable and recommends it over IPVS; IPVS is deprecated in Kubernetes 1.35 and later. I updated the recommendation to prefer `nftables`, with IPVS only as an older-cluster fallback.
- The CNI performance comparison made a broad claim that Calico and Cilium are typically faster than Flannel VXLAN because of encapsulation efficiency. I narrowed this to mode-specific behavior: native routing, selective encapsulation, and eBPF datapaths can improve performance, but results depend on configuration and the underlying network.

## Review Notes
The remaining commands are diagnostic examples that depend on cluster permissions, container image tooling, CNI choice, and Linux distribution packages. The latency and throughput thresholds are reasonable rules of thumb, but real baselines should be established per cluster and cloud/network topology.
