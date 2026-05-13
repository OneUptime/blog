# Validation Summary: Monitor Native Routing with Calico eBPF

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Calico (v3.23+ / calicoctl v3.27+)
- Calico eBPF data plane
- Calico native routing (no overlay encapsulation)
- Kubernetes (`kubectl debug node`, `kubectl exec`, `kubectl run`)
- Linux networking: iproute2 (`ip route`, `ip link`), tc filters
- eBPF tooling: `bpftool`, BPF filesystem (`/sys/fs/bpf/tc/`)
- Felix (Calico's per-node agent) Prometheus metrics
- Prometheus Operator (`PrometheusRule` CRD, `monitoring.coreos.com/v1`)
- iperf3 throughput benchmarking
- hping3 latency testing
- nicolaka/netshoot debug image

## Sources Consulted
- Calico IP pool resource reference — https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico VXLAN/IPIP encapsulation modes — https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Calico eBPF data plane enablement and kernel requirements — https://docs.tigera.io/calico/latest/operations/ebpf/enabling-ebpf
- Felix Prometheus metrics reference — https://docs.tigera.io/calico/latest/reference/felix/prometheus
- Kubernetes `kubectl debug` node debugging — https://kubernetes.io/docs/tasks/debug/debug-cluster/kubectl-node-debug/
- Prometheus Operator `PrometheusRule` CRD docs

## Issues Found

1. **Incorrect minimum kernel version.** Post stated Linux kernel `5.3+`. Calico's eBPF data plane currently requires `5.10+` for CO-RE support per the official enablement guide. Updated the Prerequisites section to `5.10+` with a brief reason.

2. **Fabricated Felix Prometheus metrics in alert rules.** The post used `felix_route_table_list_failures_total` and `felix_bpf_enabled`, neither of which exist in Felix's exposed metrics. Replaced with real metrics:
   - `felix_route_table_list_failures_total > 0` → `rate(felix_int_dataplane_failures[5m]) > 0` (counter of int-dataplane sync failures, which covers route programming failures).
   - `felix_bpf_enabled != 1` → `felix_bpf_dirty_dataplane_endpoints > 0` (real BPF endpoint health gauge — non-zero indicates endpoints whose BPF state could not be synced).
   Alert names and summary strings were updated to match the new semantics.

3. **Non-existent "Calico auto-routing mode".** Best Practices listed "Enable Calico's auto-routing mode which automatically selects native routing where possible and falls back to VXLAN." This is not a real Calico feature. Calico has `ipipMode` / `vxlanMode` set to `Never`, `Always`, or `CrossSubnet`. `CrossSubnet` uses native routing **within a subnet** and encapsulation when crossing subnet boundaries — the decision is topology-based, not a runtime fallback. Replaced the bullet with an accurate description of `CrossSubnet`.

4. **`bpftool` under `kubectl debug node` needs elevated capabilities.** The default debug pod is not privileged, so `bpftool prog list` / `bpftool map list` typically cannot enumerate kernel BPF objects without `CAP_SYS_ADMIN`. Added `--profile=sysadmin` to the three `bpftool` / `tc filter show` commands in Step 3 and added a brief inline note explaining why.

## Review Notes

- The `calico-node -felix-live` health endpoint command in Step 2 is a real Felix liveness probe used by the Calico DaemonSet — kept as-is.
- The `kubectl debug node/<name>` pod uses host network, IPC, and PID namespaces, so `ip route show`, `ip link show`, and `ls /sys/fs/bpf/tc/` against the host filesystem all work correctly. The `/sys/fs/bpf` BPF filesystem is per-mount-namespace but `kubectl debug node` mounts the host root and the kernel BPF objects are visible via `bpftool` (with sufficient privilege).
- The `iperf3` and `hping3` commands using `kubectl run --overrides` are functional but `kubectl run` is increasingly limited in newer Kubernetes versions; users on very recent kubectl may prefer creating an explicit Pod manifest. Not a correctness issue.
- Prometheus alert thresholds are illustrative; production deployments should tune `for:` durations and add per-host labels.
- The post's overall architectural claims about native routing + eBPF performance benefits (no encapsulation overhead, no iptables rule evaluation) are accurate.
