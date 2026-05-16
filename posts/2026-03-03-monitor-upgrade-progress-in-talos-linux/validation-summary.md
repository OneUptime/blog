# Validation Summary: How to Monitor Upgrade Progress in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux
- talosctl CLI
- Kubernetes (kubectl)
- etcd
- Prometheus / Grafana (referenced for dashboarding)
- Bash scripting

## Sources Consulted
- [Talos CLI Reference (v1.7)](https://docs.siderolabs.com/talos/v1.7/reference/cli/) — verified `events`, `dmesg`, `logs`, `services`, `health`, `etcd status`, `etcd members` subcommands and their flags (including `--wait-timeout` on `health`).
- [Sidero Talos Troubleshooting Docs](https://docs.siderolabs.com/talos/v1.9/troubleshooting/troubleshooting) — confirmed valid services names usable with `talosctl logs` (including `controller-runtime` and `machined`).
- [siderolabs/talos GitHub issue #5908: JSON/YAML output for talosctl version](https://github.com/siderolabs/talos/issues/5908) — confirmed `talosctl version` only emits text and that its output contains separate `Client:` and `Server:` blocks, each with a `Tag:` line (Client appears first).

## Issues Found
1. **Bug in the rolling-upgrade progress tracker script.** The original line
   ```bash
   VERSION=$(talosctl version --nodes ${node} 2>/dev/null | grep "Tag:" | head -1 | awk '{print $2}')
   ```
   used `head -1`, which returns the **Client** tag (the local talosctl version), not the node's **Server** tag. As a result the script would always report the local talosctl version for every node — making the UPGRADED/PENDING comparison meaningless. Changed `head -1` to `tail -1` so the script captures the trailing `Server:` block's `Tag:` line (single-node query, so this is unambiguous).

## Review Notes
- The Prometheus query `talos_version` in the dashboard example is illustrative; Talos does not natively expose a `talos_version` metric. Readers building this dashboard will need to source node versions from another exporter (e.g., kube-state-metrics annotations or a custom exporter querying the Talos machine API). Not a factual error in the post, but worth noting as a caveat.
- `etcd_disk_wal_fsync_duration_seconds` is a histogram metric, so an actual Grafana panel would typically wrap it in `histogram_quantile(...)` rather than graph the base metric. The post's wording ("metrics to watch") is generic enough that this isn't incorrect.
- The example output of `talosctl services` omits some services that would typically appear (e.g., `udevd`, `kubelet` is shown, `cri` and `containerd` are both shown which is correct for Talos's split system/CRI containerd). The shortened list is fine for illustration.
- Bash idiom `((UPGRADED++))` returns non-zero when incrementing from 0, which under `set -e` would abort the script. The post doesn't use `set -e`, so it works as written, but readers porting this into a stricter script should be aware.
