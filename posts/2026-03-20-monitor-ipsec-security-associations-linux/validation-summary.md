# Validation Summary: How to Monitor IPsec Security Associations (SA) on Linux

## Status
validated

## Post Type
Tutorial / How-To Guide

## Technologies Covered
- IPsec (Security Associations, IKE/ESP)
- strongSwan (`ipsec status`, `ipsec statusall`, `ipsec restart` — legacy stroke commands)
- Linux XFRM framework (`ip xfrm state`)
- tcpdump
- Bash shell scripting
- Prometheus (via third-party exporter)

## Sources Consulted
- strongSwan Plugins documentation: https://docs.strongswan.org/docs/latest/plugins/plugins.html
- strongSwan `ipsec` legacy command reference: https://docs.strongswan.org/docs/latest/howtos/usableExamples.html
- `ip-xfrm(8)` man page (iproute2)
- `pcap-filter(7)` man page (tcpdump filter syntax)
- Linux kernel `/proc/net/xfrm_stat` documentation
- torilabs/ipsec-prometheus-exporter: https://github.com/torilabs/ipsec-prometheus-exporter
- sergeymakinen/ipsec_exporter: https://github.com/sergeymakinen/ipsec_exporter
- Prometheus default port allocations: https://github.com/prometheus/prometheus/wiki/Default-port-allocations

## Issues Found

1. **Incorrect tcpdump filter syntax (`proto 50`)** — In `pcap-filter(7)`, bare `proto N` is an alias for `ether proto N` (link-layer protocol), not IP protocol. To match ESP at IP layer, the correct form is `ip proto 50` (or simply `esp`). Changed `proto 50` → `ip proto 50`.

2. **Misleading `ss -s` example for ESP socket state** — `ss -s` reports a summary of socket types (TCP/UDP/RAW/FRAG). ESP packets are processed in-kernel via XFRM and are not represented as user-space sockets, so `ss -s` does not show ESP state. Replaced with `cat /proc/net/xfrm_stat`, which actually exposes kernel XFRM error/drop counters relevant to IPsec monitoring.

3. **Fictional strongSwan Prometheus plugin** — The post claimed strongSwan ships a built-in `prometheus` plugin configurable in `strongswan.conf` and scraped on port 9119. This plugin does not exist in strongSwan; port 9119 is the registered Prometheus port for the BIND exporter, not strongSwan. Rewrote the section to reference real third-party exporters (`torilabs/ipsec-prometheus-exporter`, `sergeymakinen/ipsec_exporter`) that connect to strongSwan's vici socket, with the correct default port (8079) and a corrected `vici` plugin configuration snippet.

## Review Notes

- The post uses the **legacy stroke-based** strongSwan CLI (`ipsec status`, `ipsec statusall`, `ipsec restart`). These remain functional but are deprecated in favor of the modern `swanctl` / vici interface (`swanctl --list-sas`, `swanctl --reload-conns`, `swanctl --initiate`). Future revisions could mention or migrate to `swanctl`.
- The `MAX_AGE_SECONDS=300` variable in the monitoring script is defined but never used. Not a technical error, just dead code.
- The example `statusall` output, XFRM state output, SPI hex strings, and IKE/ESP proposal strings (`AES_CBC_256/HMAC_SHA2_256_128/PRF_HMAC_SHA2_256/MODP_2048`) match real strongSwan output formats.
- The `[N]` (IKE_SA) vs `{N}` (CHILD_SA) bracket convention shown in the output is correct per strongSwan conventions.
- The `sudo ipsec restart` health-check pattern is heavy-handed for production (it tears down all tunnels); a future version could recommend `ipsec down <conn>` / `ipsec up <conn>` or `swanctl --terminate` / `swanctl --initiate` for targeted recovery.
