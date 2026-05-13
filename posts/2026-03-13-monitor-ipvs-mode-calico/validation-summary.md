# Validation Summary: Monitor IPVS Mode in Calico

## Status
validated

## Post Type
Tutorial / Operations Guide

## Technologies Covered
- Calico (v3.27+)
- IPVS (IP Virtual Server) — Linux kernel L4 load balancer
- kube-proxy (IPVS mode)
- Kubernetes (kubectl, NetworkPolicy v1, Services)
- `ipvsadm` CLI
- `nf_conntrack` (netfilter connection tracking)
- Prometheus Operator (`PrometheusRule` CRD, `monitoring.coreos.com/v1`)
- node_exporter metrics (`node_nf_conntrack_entries`, `node_nf_conntrack_entries_limit`)
- Felix metrics (`felix_int_dataplane_failures`)
- `kubectl debug node/` with `nicolaka/netshoot` image

## Sources Consulted
- [Calico Felix Prometheus metrics reference](https://docs.tigera.io/calico/latest/reference/felix/prometheus)
- [projectcalico/calico — felix/dataplane/linux/int_dataplane.go](https://github.com/projectcalico/calico/blob/master/felix/dataplane/linux/int_dataplane.go)
- Kubernetes documentation on kube-proxy IPVS mode and `strictARP`
- `kubectl debug node/` documentation (Kubernetes node debug pod semantics — hostNetwork/hostPID and `/host` mount)
- node_exporter conntrack collector metric names
- `ipvsadm` man page (flag verification for `-ln`, `--stats`)
- nicolaka/netshoot image inventory (confirming `ipvsadm`, `lsmod`, `cat` availability)

## Issues Found
- **Incorrect Felix metric name**: The PrometheusRule expression referenced `felix_int_dataplane_failures_total`, but Felix exposes this counter as `felix_int_dataplane_failures` (no `_total` suffix). The metric is registered in Felix's `int_dataplane.go` with the literal name `felix_int_dataplane_failures`, and the Tigera docs list it that way. Updated the `expr` in Step 5 to `rate(felix_int_dataplane_failures[5m]) > 0` so the alert will actually fire on dataplane failures instead of silently matching nothing.

## Review Notes
- The O(1) vs O(n) framing for IPVS vs iptables is a fair simplification — IPVS uses hash tables for virtual-server lookup, while iptables in pre-`nft` mode performs linear chain traversal. Newer kube-proxy `nftables` mode (alpha/beta in recent Kubernetes releases) narrows this gap, but the comparison as written is still accurate for the iptables backend the post is contrasting against.
- Step 2's loop that "checks for services without IPVS entries" only `echo`s the IPs — it does not actually compare against `ipvsadm -ln` output. The intent is clear from the surrounding text, and the command isn't *wrong*, just a sketch; left as-is since the task scope is technical correctness, not feature completeness.
- Step 3 uses namespace `test` without creating it. `kubectl create deployment ... -n test` will fail if the namespace doesn't exist. This is a small usability gap rather than a technical inaccuracy in the underlying Kubernetes/Calico behavior; left as-is to avoid scope creep beyond technical-correctness fixes.
- The `cat /proc/sys/net/netfilter/nf_conntrack_max` and `nf_conntrack_count` reads from inside the `kubectl debug node/` debug pod are correct because that pod runs with `hostNetwork: true`, so `/proc/sys/net/*` reflects the host network namespace's sysctls. `nf_conntrack_max` is global; `nf_conntrack_count` is per-netns and matches the host with hostNetwork.
- `strictARP: true` advice is correct and is the standard recommendation when running IPVS mode alongside MetalLB or similar L2 advertisement components; it lives under `ipvs.strictARP` in the kube-proxy ConfigMap.
- Calico v3.27 is a real release; as of May 2026 newer releases (3.28, 3.29, 3.30) exist but the prerequisite is stated as v3.27+ which remains valid.
