# Validation Summary: How to Explain eBPF in Calico to Your Team

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico
- Kubernetes
- eBPF
- kube-proxy
- iptables
- BPF maps
- bpftool

## Sources Consulted
- Calico documentation: About Calico eBPF, https://docs.tigera.io/calico/latest/about/kubernetes-training/about-ebpf
- Calico documentation: Install in eBPF mode, https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Enabling the eBPF data plane, https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: System requirements for Kubernetes, https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Tigera blog: What's new in Calico v3.13, https://www.tigera.io/blog/whats-new-in-calico-v3-13
- Linux kernel documentation: BPF maps, https://www.kernel.org/doc/html/v6.6/bpf/maps.html
- bpftool map help output from the local installed CLI

## Issues Found
- The post said Calico eBPF requires Linux kernel 5.3 or later. Current Calico documentation lists Linux kernel 5.10 or later for the base eBPF dataplane, with supported distribution backports such as RHEL 8.4's 4.18.0-305 kernel as an exception. Updated the manager-facing quote accordingly.
- The post said Calico eBPF has been stable since v3.13. Tigera's v3.13 announcement described the eBPF dataplane as a tech preview, not production-ready. Updated the wording to say it was introduced in v3.13 and is documented as a supported dataplane in current releases.
- The source-IP statement was too broad. Calico documentation specifically highlights preserving external source IP for traffic from outside the cluster, especially NodePort paths. Added a qualifier for supported service paths such as NodePort.
- The performance explanation said fewer NAT hops mean lower latency for every request. Calico documentation supports reduced service latency and less NAT overhead, but "every request" was too absolute. Changed it to "can mean lower latency, especially for service connections."
- The SRE diagram described eBPF as O(1) with constant CPU overhead. Calico documents BPF maps and lower CPU per Gbit, but constant CPU overhead is an oversimplification. Updated the diagram wording to map-based lookups and lower CPU per Gbit at scale.

## Review Notes
The `bpftool map list` command is valid; local `bpftool map help` confirms `show` and `list` are accepted aliases for displaying loaded maps. The post is intentionally a communication guide, so the remaining analogies are acceptable as long as they are read as simplified explanations rather than precise dataplane pseudocode.
