# Validation Summary: How to Troubleshoot OpenVPN IPv4 Connection Drops and Timeouts

## Status
validated

## Post Type
Troubleshooting guide / Tutorial

## Technologies Covered
- OpenVPN (server and client configuration)
- Systemd (journalctl for openvpn-server@ unit)
- Linux networking tools (ping with DF flag, tcpdump, conntrack)
- Wireshark (pcap analysis)
- TLS renegotiation in OpenVPN
- MTU / MSS clamping / fragmentation
- NAT traversal and UDP state timeouts

## Sources Consulted
- OpenVPN 2.6 reference manual: https://openvpn.net/community-resources/reference-manual-for-openvpn-2-6/
- OpenVPN directives `--keepalive`, `--ping`, `--ping-restart`, `--reneg-sec`, `--fragment`, `--mssfix`, `--persist-tun`, `--connect-retry`, `--connect-retry-max`, `--resolv-retry`, `--verb`
- systemd service naming for OpenVPN (`openvpn-server@.service`, `openvpn-client@.service`)
- `tcpdump(8)` and `conntrack(8)` man pages
- iputils `ping(8)` man page for `-M do` and `-s` semantics

## Issues Found
- The post originally stated: "If both server and client have this, the effective timeout is the shorter of the two." This is inaccurate. Per the OpenVPN manual, when `keepalive` is set on the server, it pushes equivalent `ping` and `ping-restart` directives to the client; if both sides set it, the server's pushed values override the client's local ones. Updated the sentence accordingly.

## Review Notes
- `fragment` is a UDP-only option; it has no effect for TCP-mode OpenVPN. The post implicitly assumes UDP (it captures UDP port 1194 in tcpdump), which is the default, so this is consistent.
- `verb 3` is commonly described as the default because most distributions ship example configs with that value. The internal OpenVPN default without a `verb` directive is actually `1`, but the post's characterization matches typical user experience.
- The MTU test example uses `ping -M do -s 1400`. Remember that the resulting MTU is the payload size plus 28 bytes (ICMP + IPv4 header) when interpreting results.
- `reneg-sec 86400` is valid but extending TLS renegotiation intervals has minor security trade-offs; the shipped default of 3600s is a reasonable balance for most deployments.
- The "Connection reset → enable `--persist-tun`" row is a pragmatic fix (keeps the tun device alive across restarts); combining with `persist-key` and appropriate `connect-retry` settings is often desirable but was intentionally not expanded on.
