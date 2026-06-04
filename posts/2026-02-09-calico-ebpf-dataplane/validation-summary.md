# Validation Summary: How to configure Calico eBPF dataplane for native routing

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Kubernetes
- Calico Open Source
- Calico eBPF dataplane
- Tigera Operator
- FelixConfiguration
- kube-proxy replacement
- Direct Server Return (DSR)
- Prometheus / ServiceMonitor
- bpftool and Calico BPF troubleshooting commands

## Sources Consulted
- Calico Open Source 3.32 system requirements: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico eBPF install guide: https://docs.tigera.io/calico/latest/operations/ebpf/install
- Calico eBPF enablement guide: https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico Felix configuration reference: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico eBPF troubleshooting guide: https://docs.tigera.io/calico/latest/operations/ebpf/troubleshoot-ebpf
- Calico Felix Prometheus metrics reference: https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Calico component metrics guide: https://docs.tigera.io/calico/latest/operations/monitor/monitor-component-metrics
- Calico eBPF use cases: https://docs.tigera.io/calico/latest/operations/ebpf/use-cases-ebpf

## Issues Found
- The post listed kernel 5.3 as the minimum. Updated it to Calico 3.32's documented eBPF minimum of Linux kernel 5.10, with the RHEL 4.18.0-305 exception.
- The installation manifest used Calico v3.27.0 and placed `linuxDataplane: BPF` at the wrong level. Updated the manifest URL to v3.32.0 and moved `linuxDataplane` under `spec.calicoNetwork`.
- The installation example did not account for API server bootstrap and kube-proxy management in operator-managed BPF mode. Added `bpfNetworkBootstrap: Enabled` and `kubeProxyManagement: Enabled`.
- The Felix examples used deprecated `bpfConnectTimeLoadBalancingEnabled`. Replaced it with `bpfConnectTimeLoadBalancing: Enabled`.
- The Felix examples included `tunl0` in `bpfDataIfacePattern`, which should target data interfaces that carry workload and external service traffic. Removed `tunl0` from the example pattern.
- The `bpfPSNATPorts` example used an invalid hyphenated range. Changed it to the documented colon range format, `20000:29999`.
- Several comments described Felix options inaccurately, including `bpfHostNetworkedNATWithoutCTLB` and `bpfKubeProxyIptablesCleanupEnabled`. Updated the comments to match their documented behavior.
- The DSR section implied cloud LoadBalancer traffic generally works with DSR. Added the documented AWS/GCP requirements and the cloud load balancer return-path caveat.
- The post used `calico-bpf stats`, which is not the current Calico Open Source troubleshooting interface. Replaced those examples with `calico-node -bpf counters dump`.
- The Prometheus metrics listed non-existent `calico_bpf_*` names. Replaced them with documented `felix_bpf_*` metrics.
- The ServiceMonitor example selected pods directly and did not enable or expose Felix metrics. Added `prometheusMetricsEnabled: true`, a headless Felix metrics Service on port 9091, and a ServiceMonitor that selects that Service.
- The map sizing explanation confused NAT frontend entries with backend endpoint entries. Updated the notes to reflect the documented frontend/backend map purposes.
- The performance claims used unsupported fixed percentages and absolute O(1) service-scaling language. Reworded them to documented qualitative claims about higher throughput, lower first-packet latency, service dataplane sync CPU, and avoiding linear iptables chain traversal.

## Review Notes
The guide is now technically consistent with current Calico Open Source 3.32 documentation. Future updates should re-check Calico version-specific defaults because eBPF, kube-proxy management, metrics, and Felix BPF settings have changed across recent Calico releases.
