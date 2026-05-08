# Validation Summary: Fixing Multi-Stream Performance Issues in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- Linux networking
- ethtool
- XDP/eBPF
- kubelet CPU and topology managers
- iperf3

## Sources Consulted
- Cilium kube-proxy replacement and XDP acceleration documentation: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- Cilium performance tuning guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium eBPF maps documentation: https://docs.cilium.io/en/latest/network/ebpf/maps/
- Kubernetes Topology Manager documentation: https://kubernetes.io/docs/tasks/administer-cluster/topology-manager/
- Kubernetes CPU Manager policy documentation: https://kubernetes.io/docs/tasks/administer-cluster/cpu-management-policies/
- Local ethtool manual and CLI help for channel, ring, and RSS hash options.

## Issues Found
- The DaemonSet used `busybox:1.36`, which does not provide `ethtool`. Changed it to `alpine:3.19` and installed `ethtool` before running the tuning commands.
- The XDP section described acceleration too broadly. Updated it to match Cilium's documented scope: NodePort, LoadBalancer, and externalIP service handling with kube-proxy replacement enabled.
- The XDP Helm command did not preserve existing values or enable kube-proxy replacement. Added `--reuse-values` and `--set kubeProxyReplacement=true`.
- XDP verification used `cilium status --verbose` generically. Changed it to the documented `kubectl -n kube-system exec ds/cilium -- cilium-dbg status --verbose` form.
- The BPF map Helm values used obsolete/incorrect names `bpf.ctGlobalTCPMax` and `bpf.ctGlobalAnyMax`. Replaced them with current chart values `bpf.ctTcpMax` and `bpf.ctAnyMax`.
- The BPF map section claimed map sizing reduces contention. Changed the wording to capacity tuning, which matches the configured values.
- The NUMA section claimed Cilium agents would be aligned by the shown pod example. Narrowed the claim to test pods.
- The kubelet configuration example appended settings to the config file, which could create duplicate YAML keys, and omitted the CPU manager checkpoint requirement. Changed it to an edit-oriented YAML snippet and added removal of `/var/lib/kubelet/cpu_manager_state` before restarting kubelet.
- The troubleshooting fallback suggested `loadBalancer.acceleration=generic`, which is not a valid current Cilium Helm value. Replaced it with `best-effort` for mixed device support or disabling acceleration.

## Review Notes
- The ethtool queue, RSS hash, and ring buffer commands are syntactically valid, but driver support and maximum values are NIC-specific.
- The DaemonSet approach applies tuning when the pod starts; environments where NetworkManager or other host tooling resets NIC settings may still need host-level persistence.
