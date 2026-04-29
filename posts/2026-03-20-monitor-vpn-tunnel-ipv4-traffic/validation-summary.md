# Validation Summary: How to Monitor VPN Tunnel IPv4 Traffic and Bandwidth Usage

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- WireGuard (`wg show`, `wg show ... dump`, `latest-handshakes`)
- OpenVPN (status file format, `CLIENT_LIST` records)
- vnstat (interface traffic accounting)
- iftop (real-time bandwidth, BPF filters)
- Prometheus + `mindflavor/prometheus-wireguard-exporter`
- Bash scripting (awk, while-read loops)

## Sources Consulted
- WireGuard `wg(8)` man page — https://www.man7.org/linux/man-pages/man8/wg.8.html (verified `wg show ... dump` peer line field order: public-key, preshared-key, endpoint, allowed-ips, latest-handshake, transfer-rx, transfer-tx, persistent-keepalive)
- `prometheus_wireguard_exporter` repository — https://github.com/MindFlavor/prometheus_wireguard_exporter (verified recommended `docker run` invocation requires `--net=host` plus `--cap-add=NET_ADMIN`)
- OpenVPN status file format reference (CLIENT_LIST schema: Common Name, Real Address, Virtual Address, Virtual IPv6 Address, Bytes Received, Bytes Sent, Connected Since, ...) — confirmed `$6` and `$7` correspond to bytes received/sent
- vnstat man page (verified `-h`, `-d`, `-m` flags for hourly/daily/monthly output)
- iftop man page (verified `-i`, `-n`, `-f` flags; `ip` is a valid pcap filter expression matching IPv4)

## Issues Found
1. **Incorrect field order in `wg show all dump` parsing script.** The original `read` call used `... ips keepalive rx tx handshake`, but the documented field order is `... allowed-ips latest-handshake transfer-rx transfer-tx persistent-keepalive`. Fixed to `... ips handshake rx tx keepalive` so `$rx` and `$tx` actually contain the byte counters and the logged output is correct.
2. **`docker run` for `prometheus-wireguard-exporter` would not work as written.** The exporter needs to query the host's WireGuard interface via netlink, which requires the container to share the host's network namespace. The original command used `-p 9586:9586` with the default bridge network, where the container cannot see `wg0` even with `NET_ADMIN`. Replaced `-p 9586:9586` with `--net=host` to match the upstream project's documented invocation.

## Review Notes
- The `if [ "$endpoint" != "(none)" ]` check in the WireGuard scripting section is intended to skip the interface line, but it actually skips peer lines whose endpoint has not been set yet. For a single-interface setup with all peers connected this works in practice, so I left it as-is to avoid expanding scope beyond technical correctness.
- The "Initialize monitoring on the WireGuard interface" comment for `sudo vnstat -i wg0` is slightly misleading — modern vnstat 2.x auto-detects new interfaces via the daemon and `vnstat -i wg0` simply queries stats; manual addition uses `vnstat --add -i wg0`. The command itself runs without error, so this was left unchanged.
- `iftop -f "ip"` is technically redundant for the stated IPv4-only filtering goal in environments where IPv6 is disabled, but it is a valid pcap filter (matches `ETH_P_IP`) and correctly excludes IPv6 traffic, so no change was made.
- The OpenVPN status example only shows the legacy v1 format. v2/v3 status formats include additional fields, but the awk script keys on column position `$6`/`$7` which remain valid for the v1 default that ships with most distributions.
