# Validation Summary: How to Monitor WireGuard Tunnel Status on Talos Linux

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Talos Linux (talosctl)
- WireGuard (wireguard-tools / `wg`)
- Kubernetes (DaemonSet, CronJob, Pod, PrometheusRule CRD)
- Prometheus + prometheus-wireguard-exporter (mindflavor)
- Grafana
- Alpine Linux

## Sources Consulted
- WireGuard generic netlink family spec — https://docs.kernel.org/next/netlink/specs/wireguard.html
- WireGuard `wg(8)` man page (output / `latest-handshakes` format) — https://man7.org/linux/man-pages/man8/wg.8.html
- MindFlavor prometheus_wireguard_exporter README — https://github.com/MindFlavor/prometheus_wireguard_exporter/blob/master/README.md
- talosctl CLI reference (Talos v1.6) — https://docs.siderolabs.com/talos/v1.6/reference/cli/
- Sidero feature request confirming there is no `talosctl ping` — https://github.com/siderolabs/talos/issues/10983
- Alpine Linux `wireguard-tools` package — https://pkgs.alpinelinux.org/package/edge/main/x86/wireguard-tools

## Issues Found

1. **`/proc/net/wireguard` does not exist.** WireGuard's kernel module exposes state via generic netlink (family `wireguard`), not via procfs. The original post referenced this file in four places:
   - `talosctl -n ... read /proc/net/wireguard` (manual check) — would fail with "no such file or directory".
   - The multi-node script that read and grepped `/proc/net/wireguard` per node — same problem.
   - The DaemonSet `volumeMounts`/`volumes` that bind-mounted `/proc/net/wireguard` as a hostPath — the mount would fail because the path does not exist, and `mindflavor/prometheus-wireguard-exporter` does not read this file anyway (it shells out to `wg show all dump`).
   - The CronJob `cat /proc/net/wireguard | grep ...` — would print nothing.

   **Fix:** Replaced manual reads with `talosctl get links wg0` and `talosctl get addresses` (which are real talosctl resource queries), plus a debug-Pod recipe that installs `wireguard-tools` in Alpine and runs `wg show` with `hostNetwork: true` + `NET_ADMIN`. Removed the bogus `/proc/net/wireguard` volume from the DaemonSet and added an explanatory sentence about why the exporter only needs hostNetwork + NET_ADMIN. Rewrote the CronJob to install `wireguard-tools` and parse `wg show wg0 latest-handshakes` (whose script-friendly output is `<public-key>\t<unix-timestamp>`).

2. **`talosctl ping` is not a real subcommand.** Confirmed against the v1.6 CLI reference and the open Sidero feature request asking for this command. Removed the `talosctl -n ... ping 10.10.0.2` line from the manual section.

3. **DaemonSet exporter wiring described inaccurately.** Beyond the bogus volume mount, the text said the exporter reads "the WireGuard proc file." Replaced with an accurate description: the exporter container ships with `wg` and calls `wg show all dump`, requiring `hostNetwork: true` and `NET_ADMIN`.

## Review Notes

- The Grafana JSON snippet, PrometheusRule, and metric names (`wireguard_received_bytes_total`, `wireguard_sent_bytes_total`, `wireguard_latest_handshake_seconds`) are consistent with what the mindflavor exporter actually emits, so those sections were left alone.
- WireGuard's rekey/handshake timing description ("every two minutes when traffic is flowing") is a reasonable simplification of the protocol's `REKEY_AFTER_TIME = 120s` constant; left as-is.
- Image tag `mindflavor/prometheus-wireguard-exporter:3.6.6` is a real published tag; default port `9586` is correct.
- The debug-pod recipe runs `apk add` inside the pod which is fine for ad-hoc inspection but would be slow for repeated use; a long-lived sidecar/daemonset with `wireguard-tools` baked in would be more efficient if this becomes routine.
- The CronJob alerts on the freshest handshake across all peers; this is a reasonable default but won't detect a single dead peer when other peers are healthy. Worth noting if the user later wants per-peer alerting (which the Prometheus path already provides).
- For users running Talos KubeSpan (Talos's built-in WireGuard mesh) specifically, there are dedicated resources (`talosctl get kubespanpeerstatuses`) that would give peer-level info directly. The post is written for user-configured WireGuard rather than KubeSpan, so this was not added.
