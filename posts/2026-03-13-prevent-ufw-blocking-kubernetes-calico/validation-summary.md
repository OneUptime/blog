# Validation Summary: How to Prevent UFW from Blocking Kubernetes When Using Calico

## Status
validated

## Post Type
Troubleshooting / prevention guide

## Technologies Covered
- UFW (Uncomplicated Firewall) on Ubuntu
- Kubernetes (API server, kubelet, kube-scheduler, kube-controller-manager, etcd)
- Calico CNI (BGP, IPIP, VXLAN, Typha, Felix, GlobalNetworkPolicy, HostEndpoint)
- cloud-init / systemd
- iptables / netfilter

## Sources Consulted
- Kubernetes ports and protocols: https://kubernetes.io/docs/reference/networking/ports-and-protocols/
- kube-scheduler insecure port removal (kubernetes/kubernetes#106885): https://github.com/kubernetes/kubernetes/issues/106885
- Calico system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Monitor Calico component metrics (Felix `PrometheusMetricsPort`): https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico GlobalNetworkPolicy reference: https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- UFW man page (Ubuntu Jammy): https://manpages.ubuntu.com/manpages/jammy/man8/ufw.8.html

## Issues Found
1. **Outdated kube-scheduler port (10251/tcp).** Port 10251 was the *insecure* HTTP port for kube-scheduler. It was deprecated in favor of the secure HTTPS port **10259** (introduced in v1.13) and fully removed in Kubernetes v1.23. Changed the UFW rule from `ufw allow 10251/tcp` to `ufw allow 10259/tcp`.

2. **Outdated kube-controller-manager port (10252/tcp).** Same story: 10252 was the insecure port; it was replaced by **10257** (introduced in v1.12) and removed alongside 10251 in v1.23. Changed the UFW rule from `ufw allow 10252/tcp` to `ufw allow 10257/tcp`.

3. **Invalid UFW syntax for IPIP (`ufw allow proto 4 from <node-cidr>`).** UFW's `proto` keyword only accepts the named protocol set (`tcp`, `udp`, `ah`, `esp`, `gre`, `ipv6`, `igmp`) per the UFW man page — it rejects raw IP protocol numbers, so this command would fail to parse. Removed the broken `ufw allow proto 4` line and replaced it with a commented note explaining that IPIP cannot be allowed via `ufw allow` and must instead be added as a raw rule to `/etc/ufw/before.rules` (e.g., `-A ufw-before-input -p 4 -s <node-cidr> -j ACCEPT`).

## Review Notes
- The Felix Prometheus metrics port (9091/tcp) is correct as Calico's default, but per Tigera docs, Felix metrics are disabled by default (`prometheusMetricsEnabled: false`). Annotated the rule with "(if enabled)" so readers don't open a port they aren't actually using.
- The post does not cover a few ports a reader on a worker node may also need: **10256/tcp** (kube-proxy health) and **30000-32767/tcp** (NodePort range). These are out of scope for the post's narrower "Calico+UFW conflict" theme, so left unchanged.
- WireGuard (51820/udp for IPv4, 51821/udp for IPv6) is another Calico transport that would need a UFW exception if enabled. Not added because the post explicitly scopes itself to IPIP/VXLAN.
- The Mermaid flowchart, cloud-init snippet, GlobalNetworkPolicy manifest, and diagnosis loop are all syntactically correct as written.
