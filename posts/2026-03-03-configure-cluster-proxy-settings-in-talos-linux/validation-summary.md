# Validation Summary: How to Configure Cluster Proxy Settings in Talos Linux

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Talos Linux (machine configuration, `cluster.proxy`, `machine.kernel.modules`, `machine.features.kubePrism`, `machine.sysctls`)
- `talosctl` CLI (`apply-config`, `read`)
- Kubernetes kube-proxy (iptables and IPVS modes, conntrack and metrics flags)
- IPVS (kernel modules, scheduling algorithms — rr, lc, sh)
- Cilium / Calico eBPF kube-proxy replacement
- Prometheus metrics endpoint (port 10249)
- `kubectl` for inspecting kube-proxy DaemonSet

## Sources Consulted
- Talos v1.11 configuration reference: https://www.talos.dev/v1.11/reference/configuration/v1alpha1/config/
- Kubernetes kube-proxy command-line reference: https://kubernetes.io/docs/reference/command-line-tools-reference/kube-proxy/
- Talos KubePrism docs (default port 7445)
- kube-proxy IPVS missing-module behavior: kubernetes/kubernetes issues #92033, #63801, #70304
- Talos GitHub discussions on kube-proxy metrics scraping (#7799)

## Issues Found
- **`README.md` line 264** — the Troubleshooting section claimed missing IPVS kernel modules cause kube-proxy to fall back to iptables **silently**. This is inaccurate: kube-proxy emits an explicit error log (e.g. `"IPVS proxier will not be used because the following required kernel modules are not loaded: [ip_vs ip_vs_rr ...]"`) before falling back. Updated the sentence to: "kube-proxy logs an error naming the missing modules and falls back to iptables" so readers know to look in the logs.

Everything else verified as correct:
- `cluster.proxy` schema (`disabled`, `mode`, `extraArgs` as `map[string]string`) matches the Talos v1.11 reference.
- Default kube-proxy mode is `iptables` (Talos does not override the upstream default).
- `machine.kernel.modules` structure (list of objects with `name:`) is correct.
- `machine.features.kubePrism` fields and default port `7445` are correct.
- `machine.sysctls` accepts a string-keyed, string-valued map.
- `talosctl read --nodes <node> /proc/net/ip_vs` is valid usage.
- All cited kube-proxy flags (`metrics-bind-address`, `ipvs-scheduler`, `ipvs-min-sync-period`, `ipvs-sync-period`, `iptables-sync-period`, `iptables-min-sync-period`, `iptables-masquerade-bit`, `conntrack-max-per-core`, `conntrack-min`, `conntrack-tcp-timeout-established`, `conntrack-tcp-timeout-close-wait`) exist and are spelled correctly.
- Default kube-proxy metrics bind address is `127.0.0.1:10249` — the post's recommendation to switch to `0.0.0.0` for in-cluster Prometheus scraping is correct.
- IPVS scheduler codes `rr`, `lc`, `sh` are valid.

## Review Notes
- The conntrack example values are mostly the kube-proxy defaults (`conntrack-min: 131072`, `conntrack-tcp-timeout-established: 86400s`/24h, `conntrack-tcp-timeout-close-wait: 1h`). The only meaningfully tuned value is `conntrack-max-per-core: 65536` (default 32768). This is fine as a worked example but readers should know most values match upstream defaults.
- Edge case worth knowing (not added to post to keep scope tight): if IPVS is compiled into the kernel rather than loaded as modules, kube-proxy's module-presence check can misreport and the fallback/error path can behave differently — see k8s issues #63801, #70304.
- Newer Kubernetes releases (1.31+) add a `nftables` mode for kube-proxy. The post limits itself to `iptables` and `ipvs`, which is still the common case for Talos clusters; no correction needed, but a future revision could mention `nftables` as an emerging option.
- The post's "500+ services" rule of thumb for switching to IPVS is a reasonable, widely-cited heuristic rather than a hard rule.
