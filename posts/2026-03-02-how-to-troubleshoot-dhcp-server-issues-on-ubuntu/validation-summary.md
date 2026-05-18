# Validation Summary: How to Troubleshoot DHCP Server Issues on Ubuntu

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- ISC DHCP Server (`isc-dhcp-server`)
- ISC Kea DHCP4 Server (`kea-dhcp4-server`) and Kea Control Agent REST API
- ISC DHCP Relay (`isc-dhcp-relay`)
- `dhclient` (ISC DHCP client)
- `tcpdump`, `dhcping`, `dhcpdump`, `nmap` (`broadcast-dhcp-discover` script)
- systemd / journalctl
- `ss`, `ip`, `sysctl`
- UFW and iptables
- Ubuntu file paths (`/var/lib/dhcp/`, `/etc/dhcp/`, `/etc/kea/`, `/etc/default/`)

## Sources Consulted
- ISC Kea Administrator Reference Manual — API Commands (https://kea.readthedocs.io/en/latest/api.html), specifically `lease4-get-by-hw-address`, `lease4-del`, and `config-get` parameter shapes.
- ISC DHCP `dhcpd(8)` and `dhcpd.conf(5)` man pages (flags `-t`, `-cf`; lease file format / `binding state active`).
- ISC `dhcping(8)` man page (`-s`, `-c`, `-h` flags).
- ISC `dhclient(8)` man page (`-r` release, `-v` verbose).
- `tcpdump(8)` filter syntax for `port 67 or port 68`.
- nmap NSE script `broadcast-dhcp-discover` (https://nmap.org/nsedoc/scripts/broadcast-dhcp-discover.html).
- Ubuntu package documentation for `isc-dhcp-server`, `kea-dhcp4-server`, and `isc-dhcp-relay` (service names, default interface configuration in `/etc/default/...`).
- RFC 2131 (DHCP message types: DHCPDISCOVER / OFFER / REQUEST / ACK / NAK / RELEASE).

## Issues Found
1. **Kea `lease4-get-by-hw-address` parameter name** — The post used `"hwaddr"` as the argument key. Per the Kea API reference, the correct parameter name is `"hw-address"` (hyphenated). Sending `hwaddr` would cause the command to fail with an unknown-parameter error. Fixed by changing the JSON payload to `{"hw-address": "aa:bb:cc:dd:ee:01"}`.

## Review Notes
- The post states pool exhaustion produces "a DHCPNAK or simply no response". In practice, ISC DHCP almost always silently drops requests when no addresses are available rather than sending DHCPNAK (which is reserved for INIT-REBOOT requests where the requested IP is invalid for the network). The phrasing "or simply no response" already covers the actual behavior, so this was left as-is.
- `python3 -m json.tool` will reject Kea configs that include comments (Kea supports `#`, `//`, and `/* */` comments as a relaxed-JSON extension). The check is still useful as a basic syntax screen, but readers with commented configs may see false negatives.
- The Kea service name varies by install source: Ubuntu's archive ships `kea-dhcp4-server.service`, while ISC's upstream cloudsmith packages use `isc-kea-dhcp4-server.service`. The post's naming is correct for the standard Ubuntu package.
- The `lease4-*` commands require the `libdhcp_lease_cmds.so` hook library to be loaded in Kea's configuration; this prerequisite is not called out explicitly but is implied by the command's existence in Kea's API surface.
- `dhcping` is in Ubuntu's `universe` repository and may need to be installed (`sudo apt install dhcping`) — the post installs other tools (`dhcpdump`, `nmap`) but not `dhcping` before using it.
