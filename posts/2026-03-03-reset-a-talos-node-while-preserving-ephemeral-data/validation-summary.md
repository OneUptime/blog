# Validation Summary: How to Reset a Talos Node While Preserving Ephemeral Data

## Status
validated

## Post Type
Tutorial / Operational Guide

## Technologies Covered
- Talos Linux (v1.6+)
- `talosctl` CLI (reset, etcd, health, image, apply-config)
- Kubernetes (`kubectl` drain/delete/get nodes)
- etcd membership management
- Bash scripting

## Sources Consulted
- Talos v1.7 CLI reference: https://docs.siderolabs.com/talos/v1.7/reference/cli/
- Talos v1.7 architecture / partitions documentation: https://docs.siderolabs.com/talos/v1.7/learn-more/architecture/
- Talos source release-1.7 cli.md (raw): https://raw.githubusercontent.com/siderolabs/talos/release-1.7/website/content/v1.7/reference/cli.md
- Sidero discussion on `talosctl image` vs `talosctl images` rename (alias dropped in v1.6): https://github.com/siderolabs/talos/discussions/7625

## Issues Found
1. **Deprecated `talosctl images` command.** Step 5 used `talosctl images --nodes "${NODE_IP}"` to verify cached images. The `talosctl images` (plural) command was renamed to `talosctl image default` in v1.5 and the backward-compatible alias was dropped in v1.6. The correct command for listing cached container images on a node is `talosctl image list --nodes <ip>`. Updated the verification command to `talosctl image list --nodes "${NODE_IP}"`.

## Review Notes
- The partition descriptions are accurate: STATE holds machine configuration/node identity, EPHEMERAL is mounted at `/var` and holds containerd image cache, kubelet state, and pod ephemeral storage. Wiping only STATE preserves the image cache as the post claims.
- `--system-labels-to-wipe STATE`, `--graceful=true|false`, and `--reboot=true` are valid `talosctl reset` flags. The flag accepts multiple values (string slice) but a single `STATE` value is the documented way to target a single partition.
- `talosctl etcd members --nodes <cp-ip>` output columns are NODE, ID, HOSTNAME, PEER URLS, CLIENT URLS, LEARNER — so `grep "${NODE_IP}" | awk '{print $2}'` correctly extracts the member ID when the node IP appears in PEER/CLIENT URLs (e.g., `https://10.0.0.50:2380`). This is brittle if a hostname or another column happens to contain the IP, but the pattern is the commonly published approach and works in normal cases.
- `talosctl health --wait-timeout` and `talosctl apply-config --insecure` flags are correct for v1.7.
- The `sleep 30` / `sleep 45` waits for maintenance-mode reachability are heuristic — the post correctly presents them as such, and `talosctl health --wait-timeout 10m` is used afterwards to confirm readiness, which is the right pattern.
- The "Comparing Reset Strategies" table characterizes "EPHEMERAL only" as `--system-labels-to-wipe EPHEMERAL`; this is technically possible but unusual — readers should be aware that wiping EPHEMERAL while keeping STATE leaves the node configured but with no image cache or kubelet state, effectively forcing image re-pulls on next boot.
