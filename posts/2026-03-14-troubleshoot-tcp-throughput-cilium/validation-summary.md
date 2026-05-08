# Validation Summary: How to Troubleshoot TCP Throughput (TCP_STREAM) in Cilium Performance

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium
- Kubernetes
- eBPF/BPF datapath
- Hubble/Cilium metrics
- TCP/IP networking
- Linux kernel network counters
- iperf3
- Helm

## Sources Consulted
- Cilium command reference for `cilium-dbg`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg/
- Cilium `cilium-dbg bpf ct list` command reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bpf_ct_list/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium `cilium encryption status` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_encryption_status/
- Cilium Helm reference for `MTU`, `bpf.ctTcpMax`, and `bpf.monitorAggregation`: https://docs.cilium.io/en/latest/helm-reference/
- Cilium monitoring and metrics documentation: https://docs.cilium.io/en/stable/observability/metrics/
- Cilium IPsec transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-ipsec/
- Cilium WireGuard transparent encryption documentation: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Kubernetes `kubectl run` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes `kubectl wait` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Linux kernel SNMP counter documentation: https://docs.kernel.org/networking/snmp_counter.html

## Issues Found
- The post used `cilium` inside Cilium agent pods for agent-local commands. Current Cilium documentation uses `cilium-dbg` for the in-pod agent debug CLI, so the affected `config`, `bpf`, `monitor`, and encryption commands were updated.
- The cross-node iperf client selected `.items[1]`, which could be the same node as the server. The command now selects a node whose name differs from the server node.
- The MTU probe pinged the Kubernetes Service name. ICMP to a Service is not a reliable Kubernetes service test, so the post now records the server pod IP and pings that address.
- The post referenced `cilium bpf prog list`, which is not in the current Cilium command reference. It now uses `cilium-dbg bpf metrics list` to inspect datapath counters.
- The conntrack table check used outdated names such as `CTMapEntriesGlobalTCP` and `cilium bpf ct list global`. It now uses `cilium-dbg bpf ct list` and `bpf-ct-global-tcp-max`.
- The encryption section used fixed throughput percentages and implied WireGuard is always faster than IPsec. Those claims are environment-dependent, so the text now recommends benchmarking both and explains the variables that affect overhead.
- The softnet counter command depended on `awk strtonum`, which is not portable across common `awk` implementations. It now uses Bash arithmetic for hex conversion.
- The retransmission check used a hard-coded `/proc/net/snmp` field number. It now parses the header and reads the `RetransSegs` column by name.
- The Hubble troubleshooting note used `monitorAggregation=none`; it now names the current Helm value `bpf.monitorAggregation=none` and softens the performance claim.

## Review Notes
The guide is technically relevant and useful after these corrections. Some benchmark results still depend heavily on kernel version, cloud/network hardware, Cilium version, Cilium routing mode, and whether Prometheus/Hubble metrics are enabled.
