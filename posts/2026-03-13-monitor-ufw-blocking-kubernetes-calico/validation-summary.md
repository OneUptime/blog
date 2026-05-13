# Validation Summary: How to Monitor UFW Blocking Kubernetes When Using Calico

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- Calico CNI
- Kubernetes (DaemonSet, PrometheusRule CRDs)
- iptables / netfilter
- Prometheus / kube-state-metrics
- VXLAN (UDP 4789), IPIP (IP protocol 4), BGP (TCP 179)
- Bash scripting

## Sources Consulted
- Calico documentation on host requirements and Felix iptables management: https://docs.tigera.io/calico/latest/getting-started/kubernetes/requirements
- Calico networking: VXLAN, IPIP, BGP port references: https://docs.tigera.io/calico/latest/reference/host-endpoints/connectivity
- UFW manual page (logging, behavior, default FORWARD policy): https://manpages.ubuntu.com/manpages/jammy/en/man8/ufw.8.html
- iptables LOG target output format (PROTO=<num> for non-named protocols): Linux kernel `net/ipv4/netfilter/nf_log_ipv4.c`
- kube-state-metrics daemonset metrics (`kube_daemonset_status_number_unavailable` with `daemonset` and `namespace` labels): https://github.com/kubernetes/kube-state-metrics/blob/main/docs/metrics/workload/daemonset-metrics.md
- prometheus-operator PrometheusRule CRD (`monitoring.coreos.com/v1`): https://prometheus-operator.dev/docs/api-reference/api/
- Kubernetes DaemonSet spec (`apps/v1`, `hostNetwork`, `hostPID`, `tolerations` with `operator: Exists`): https://kubernetes.io/docs/concepts/workloads/controllers/daemonset/
- Docker Hub `busybox` and `alpine` image contents (confirming busybox does not ship iptables; alpine provides `iptables` via `apk`)
- IANA protocol assignments: IPIP = 4; VXLAN default port 4789 (RFC 7348); BGP default port 179 (RFC 4271)

## Issues Found

1. **DaemonSet used the `busybox` image, which does not ship the `iptables` binary.**
   - The script `iptables -L FORWARD -n 2>/dev/null | head -1 | grep -c "DROP"` would silently fail because `iptables: not found` was redirected to `/dev/null`. The `head -1 | grep -c "DROP"` on empty input always returns 0, so the monitor would never detect a DROP policy — the exact bug it is meant to catch.
   - Fix: switched the image to `alpine:3.19` and added `apk add --no-cache iptables` at container start. Alpine + `iptables` is the standard small-image pattern for this use case and works with `hostNetwork: true` because the container shares the host network namespace and therefore sees the host's netfilter rules.

2. **UFW log grep used `proto 4` (lowercase, space) to detect IPIP drops, which never matches.**
   - UFW logs are emitted by the iptables `LOG` target. For protocols without a kernel-side name (TCP/UDP/ICMP are named; IPIP is not), the kernel formats them as `PROTO=%u` — i.e. `PROTO=4` (uppercase, `=` separator). `grep` is case-sensitive by default, so `proto 4` would never match real UFW log lines and IPIP drops would silently slip past the filter.
   - Fix: changed the pattern to `DPT=4789|PROTO=4 |DPT=179`. The trailing space on `PROTO=4 ` prevents accidental matches against `PROTO=41`, `PROTO=47`, etc.; `DPT=4789` is also tightened from a bare `4789` for consistency.

## Review Notes

- The PrometheusRule alert is named `CalicoNodeNotReady` but actually measures the `calico-node` DaemonSet's unavailable pod count via `kube_daemonset_status_number_unavailable`. That metric does have the `daemonset` and `namespace` labels used here (verified against the kube-state-metrics docs), so the query is correct; the alert name is a minor naming concern but not technically wrong — calico-node being unavailable is a reasonable proxy for node-level Calico readiness.
- `tolerations: - operator: Exists` is intentionally broad (no `key`, no `effect`) so it tolerates every taint including `NoExecute`. That is the standard pattern for a cluster-wide monitoring DaemonSet and is correct here.
- The `iptables -L FORWARD -n | head -1` policy check works the same for both `iptables-legacy` and `iptables-nft` because both render the chain header line as `Chain FORWARD (policy DROP)` / `(policy ACCEPT)`.
- Calico's default behavior since v3.21 keeps the FORWARD policy `ACCEPT` (Felix installs explicit ACCEPT rules in `cali-FORWARD`), so UFW flipping the built-in chain policy to `DROP` is genuinely the failure mode being monitored — the post's premise is accurate.
- `alpine:3.19` (used in the fix) is a maintained release; readers running this long-term may want to pin a newer tag, but the install pattern is unchanged.
