# Validation Summary: Fixing 32-Process Performance Bottlenecks in Cilium

## Status
validated

## Post Type
Tutorial / performance tuning guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Linux networking and sysctl tuning
- ethtool, RSS, GRO, XDP
- eBPF maps
- NUMA inspection
- iperf3 benchmarking

## Sources Consulted
- Cilium Helm Reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium v1.14 Helm values in the official Cilium repository: https://raw.githubusercontent.com/cilium/cilium/v1.14.16/install/kubernetes/cilium/values.yaml
- Cilium troubleshooting documentation for `cilium-dbg monitor --type drop`: https://docs.cilium.io/en/stable/operations/troubleshooting/
- Cilium `cilium-dbg monitor` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_monitor/
- Cilium `cilium-dbg endpoint list` command reference: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_endpoint_list/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/
- Kubernetes node drain documentation: https://kubernetes.io/docs/tasks/administer-cluster/safely-drain-node/
- Linux ethtool manual page: https://man7.org/linux/man-pages/man8/ethtool.8.html

## Issues Found
- The BPF map sizing Helm keys used `bpf.ctGlobalTCPMax` and `bpf.ctGlobalAnyMax`, which do not match Cilium Helm values for v1.14+ or current stable documentation. Changed them to `bpf.ctTcpMax` and `bpf.ctAnyMax`.
- The NUMA section said the DaemonSet patch applied NUMA affinity, but the patch only sets `GOMAXPROCS`. Updated the comments to describe NUMA inspection and limiting Go scheduler parallelism instead of claiming affinity.
- The `numastat` verification command used `pgrep cilium-agent`, which can return multiple PIDs and break `numastat -p`. Changed it to select one matching agent PID.
- The XDP troubleshooting fallback used `loadBalancer.acceleration=generic`, which is not a valid Cilium Helm value. Updated the fallback to `best-effort` for newer versions or `disabled`.
- The post-fix checklist used `cilium monitor` and `cilium endpoint list`, but current Cilium references expose these as agent-local `cilium-dbg` commands. Updated the checklist to select a Cilium pod and run `cilium-dbg monitor --type drop` and `cilium-dbg endpoint list` through `kubectl exec`.

## Review Notes
The tuning values are workload- and hardware-dependent, so they should be benchmarked before production rollout. Several NIC and sysctl settings are valid commands but may be unsupported or capped by the specific driver, kernel, or cloud environment.
