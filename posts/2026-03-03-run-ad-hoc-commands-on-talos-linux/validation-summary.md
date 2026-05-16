# Validation Summary: How to Run Ad-Hoc Commands on Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl CLI)
- Kubernetes (kubectl debug, DaemonSets)
- containerd (via talosctl stats / talosctl containers)
- etcd (talosctl etcd subcommands)
- nicolaka/netshoot debug image
- Standard Linux networking tools (tcpdump, dig, nslookup, ping, iptables, nc)

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.10/reference/cli
- Talos Linux CLI reference (v1.12): https://docs.siderolabs.com/talos/v1.12/reference/cli
- GitHub issue about `talosctl disks` deprecation: https://github.com/siderolabs/talos/issues/10001
- Talos Disk Management docs: https://docs.siderolabs.com/talos/v1.9/configure-your-talos-cluster/storage-and-disk-management/disk-management
- Talos Logging configuration docs: https://www.talos.dev/v1.11/talos-guides/configuration/logging/
- Talos v1.9.0 release discussion: https://github.com/siderolabs/talos/discussions/9978

## Issues Found

1. **`talosctl disks` deprecated/removed (Talos 1.9+)** — The post used `talosctl disks --nodes ...` in two places. This subcommand was removed in Talos 1.9.0 in favor of the COSI resource form. Replaced both occurrences with `talosctl get disks --nodes ...` (one in the "Disk and Storage" section, one in the `node-health-check.sh` script).

2. **`talosctl get events` is not a valid command** — The bash script used `talosctl get events --nodes $NODE`. The correct command for streaming runtime events is `talosctl events` (the top-level command); `events` is not exposed as a COSI resource under `talosctl get`. Updated the script accordingly.

3. **Inaccurate comment for `talosctl stats`** — The post described `talosctl stats` as "Get system stats (similar to top)". In reality, `talosctl stats` returns per-container resource statistics from containerd (closer to `docker stats` than `top`). Updated the comment to "Get container resource statistics (similar to docker stats)".

## Review Notes

- `talosctl pcap` flags (`--interface`, `--output`, `--duration`) all verified against the v1.10 CLI reference and are correct.
- `talosctl logs -k <container-id>` is accepted as shown, though Talos also accepts a richer `<namespace>/<pod-name>:<container-name>:<container-id>` form. The simplified version is acceptable as a generic placeholder example.
- `talosctl read` exists and correctly reads arbitrary host files such as `/proc/cpuinfo`, `/proc/loadavg`, and `/proc/diskstats`.
- `kubectl debug node/<name>` syntax and use of the `nicolaka/netshoot` image are correct; the host filesystem is mounted at `/host` inside the debug pod.
- DaemonSet manifest is valid Kubernetes YAML; `hostNetwork`, `hostPID`, `privileged: true`, and the hostPath volume are all appropriate for the stated diagnostic use case.
- The post does not pin a specific Talos version. The `talosctl disks` fix assumes a reasonably current version (>= 1.9). For older clusters the original command may still work, but the COSI form is the forward-compatible path.
