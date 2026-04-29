# Validation Summary: How to Monitor VPN IPv6 Tunnel Status

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- WireGuard (`wg show`, kernel WireGuard)
- OpenVPN (status log, journald)
- IPsec / strongSwan (`swanctl`, `ip xfrm`)
- iproute2 (`ip -6 addr`, `ip -6 route`, `ip -6 xfrm`)
- iputils (`ping6`)
- `nc` / netcat (IPv6 TCP test)
- Prometheus + `prometheus_wireguard_exporter` (MindFlavor)
- Prometheus alerting rules
- Bash / shell scripting

## Sources Consulted
- WireGuard `wg(8)` manpage and quickstart: https://www.wireguard.com/quickstart/
- iproute2 `ip-xfrm(8)` and `ip-address(8)` manpages
- strongSwan swanctl docs: https://docs.strongswan.org/docs/latest/swanctl/swanctlListSas.html
- strongSwan swanctl tool reference: https://docs.strongswan.org/docs/latest/swanctl/swanctl.html
- OpenVPN status file documentation (community.openvpn.net)
- iputils `ping(8)` manpage
- netcat `nc(1)` manpage
- MindFlavor `prometheus_wireguard_exporter` README: https://github.com/MindFlavor/prometheus_wireguard_exporter
- Prometheus alerting rules docs: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/

## Issues Found
1. **Wrong installation toolchain for `prometheus_wireguard_exporter`.** The post used `go install github.com/MindFlavor/prometheus_wireguard_exporter@latest`, but this exporter is written in Rust, not Go. Replaced with `cargo install --git https://github.com/MindFlavor/prometheus_wireguard_exporter`.
2. **Wrong `-n` argument to the exporter.** The original `sudo prometheus_wireguard_exporter -n wg0` passed an interface name. The `-n` flag actually expects a path to a WireGuard config file (used to extract friendly names). Changed to `-n /etc/wireguard/wg0.conf`.
3. **Incorrect Prometheus metric names.** The post referenced `wireguard_peer_last_handshake_seconds`, `wireguard_peer_receive_bytes_total`, and `wireguard_peer_transmit_bytes_total`. The real metrics emitted by MindFlavor's exporter are `wireguard_latest_handshake_seconds`, `wireguard_received_bytes_total`, and `wireguard_sent_bytes_total`. Updated all three references in the metrics list and in the two alert rules so the alert expressions actually evaluate against real series.

## Review Notes
- `ping6` is deprecated in modern iputils in favor of `ping -6` (or just `ping <ipv6-addr>`). It still works on most distros via a compat symlink, but on newer systems (e.g. recent Debian/Ubuntu) it may be unavailable. Readers on those systems should substitute `ping -6`.
- The illustrative IPv6 addresses in the post (e.g. `fd00:wg::2`, `fd00:vpn-internal::gateway`, `2001:db8::vpn-server`) contain non-hex characters (`wg`, `vpn-internal`, `gateway`, `vpn-server`) and are not literally valid IPv6 strings — they are clearly placeholders that the reader is expected to replace with real addresses. Left as-is since the illustrative intent is obvious from context.
- `ip -6 xfrm state show` and `ip -6 xfrm policy show` rely on iproute2's family filter, which works on current iproute2 builds; on very old systems an alternative is `ip xfrm state show | grep -A4 inet6`.
- The shell script's `wg show $TUNNEL_IF latest-handshakes | awk '{print $2}'` will produce one line per peer; the script implicitly assumes a single peer. This is a script-design caveat, not a technical error.
- The Prometheus rules section is titled "Grafana Alert Rules" but the YAML shown is Prometheus alerting rule format, not Grafana alert rules. Both products can use these rules (Grafana can ingest Prometheus rule files), so the snippet is functionally valid; left as-is to avoid restructuring.
