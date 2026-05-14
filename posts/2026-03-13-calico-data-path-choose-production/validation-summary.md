# Validation Summary: How to Choose the Calico Data Path for Production

## Status
validated

## Post Type
Technical guide / decision framework

## Technologies Covered
- Calico Open Source
- Kubernetes CNI
- Calico standard Linux iptables dataplane
- Calico eBPF dataplane
- Calico VPP dataplane
- kube-proxy
- Linux netfilter, conntrack, and eBPF tooling

## Sources Consulted
- Calico eBPF installation documentation: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico eBPF enablement and migration documentation: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico eBPF use cases documentation: https://docs.tigera.io/calico/latest/operations/ebpf/use-cases-ebpf
- Calico VPP getting started documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/vpp/getting-started
- Calico VPP implementation details: https://docs.tigera.io/calico/latest/reference/vpp/technical-details
- Calico VPP uplink configuration reference: https://docs.tigera.io/calico/latest/reference/vpp/uplink-configuration
- Calico Windows requirements and limitations: https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/requirements and https://docs.tigera.io/calico/latest/getting-started/kubernetes/windows-calico/limitations
- Calico Linux system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus

## Issues Found
- The eBPF kernel guidance used outdated thresholds: Linux 5.3+ and 5.8+ for full support. Updated it to match current Calico documentation: Ubuntu 22.04+, RHEL 8.4 kernel 4.18.0-305+ with backports, or another supported distribution with kernel 5.10+, with kernel 6.6+ recommended for all eBPF features.
- The decision diagram used `Kernel >= 5.3?`, which no longer matches Calico's documented eBPF requirements. Changed it to a general Calico eBPF kernel requirements check.
- The VPP section said dedicated DPDK-compatible hardware was required and that VPP bypasses the kernel entirely. Updated this to reflect Calico VPP's documented interface modes, including native drivers, AF_XDP, AF_PACKET, and DPDK.
- The VPP note said VPP is not part of Calico Open Source. Updated it to state that Calico VPP is available for Calico Open Source but installed from separate VPP dataplane manifests rather than the default Calico manifests.
- The checklist incorrectly summarized VPP requirements as "DPDK NIC" and eBPF as "5.3+". Updated the checklist to reference Calico's current Linux/eBPF requirements and validated VPP interface mode.
- The NodePort source IP row overstated VPP behavior as "Native". Updated it to "Preserved when possible," matching the VPP implementation documentation.

## Review Notes
The post remains a decision framework rather than a step-by-step implementation guide. The service-count thresholds are presented as operational guidance, not hard Calico limits; future revisions could mention Calico's newer nftables dataplane option if the article is expanded beyond the original iptables/eBPF/VPP comparison.
