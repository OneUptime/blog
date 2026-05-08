# Validation Summary: How to Tune Calico on On-Prem Kubernetes for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Tigera Operator
- Calico IPPool and IPAM
- Calico eBPF dataplane
- FelixConfiguration
- Prometheus Operator ServiceMonitor
- BGP routing

## Sources Consulted
- Calico documentation: Install Calico networking and network policy for on-premises deployments - https://docs.tigera.io/calico/latest/getting-started/kubernetes/self-managed-onprem/onpremises
- Calico documentation: Install in eBPF mode - https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico documentation: Enabling the eBPF data plane - https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico documentation: Configure MTU to maximize network performance - https://docs.tigera.io/calico/latest/networking/configuring/mtu
- Calico documentation: Change IP pool block size - https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico documentation: IP pool resource - https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: FelixConfiguration resource - https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico documentation: Monitor Calico component metrics - https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- GitHub raw URL check for the referenced Calico Prometheus manifest - https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/calico-prometheus.yaml

## Issues Found
- The post described Calico eBPF as "kernel-bypass networking." Changed this to bypassing iptables-based service handling because Calico eBPF runs in the Linux kernel and replaces kube-proxy service handling rather than bypassing the kernel.
- The eBPF prerequisite listed Linux kernel 5.3+. Updated it to Linux kernel 5.10+ with the documented Red Hat 8.4 kernel exception.
- The overlay overhead claim said 50-100 bytes. Updated it to 20-50 bytes for common IP-in-IP and VXLAN overlays, matching Calico's documented header overheads.
- The IPPool patch used `spec.encapsulation`, which is an operator installation IP pool field, not a projectcalico.org IPPool field. Replaced it with `ipipMode: Never` and `vxlanMode: Never`.
- The eBPF enablement commands mixed manual Felix configuration and kube-proxy manipulation with an operator-managed installation. Replaced them with the current operator patch using `linuxDataplane: BPF`, `bpfNetworkBootstrap: Enabled`, and `kubeProxyManagement: Enabled`.
- The MTU examples used the ambiguous `installation` resource name and did not account for eBPF NodePort VXLAN handoff. Updated the resource to `installation.operator.tigera.io` and added the documented physical-MTU-minus-50 case.
- The Felix timer example claimed to increase intervals but set `iptablesRefreshInterval` lower than its documented default and set other values to defaults. Updated the example to use longer refresh intervals and clarified it applies to the iptables dataplane.
- The IPAM block-size command tried to patch `blockSize` directly on an existing pool, which Calico does not allow. Replaced it with a pre-installation operator configuration example.
- The Prometheus manifest URL returned 404. Replaced it with a valid Service and ServiceMonitor example targeting Felix metrics on port 9091.

## Review Notes
- The guide now assumes an operator-managed Calico installation for operator-specific settings. Manifest-based installations use different configuration paths for MTU and eBPF enablement.
- Changing encapsulation, MTU, eBPF dataplane mode, and IPAM block sizing can disrupt cluster networking if done without staged rollout planning. The post correctly warns to configure BGP before disabling encapsulation, but future revisions could add rollout and rollback guidance.
