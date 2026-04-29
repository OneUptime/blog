# Validation Summary: How to Monitor WiFi Client IPv4 Address Assignments on a Controller

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- UniFi Controller (`mca-dump` CLI)
- OpenWrt
- `iw` wireless utility (`iw dev <iface> station dump`)
- dnsmasq (`/tmp/dhcp.leases`, `log-dhcp`)
- Bash shell scripting
- Prometheus + snmp_exporter
- Syslog / `/var/log/messages`

## Sources Consulted
- dnsmasq man page and lease file format documentation: https://thekelleys.org.uk/dnsmasq/docs/dnsmasq-man.html
- OpenWrt DHCP/dnsmasq documentation: https://openwrt.org/docs/guide-user/base-system/dhcp
- `iw` utility documentation (Linux Wireless wiki): https://wireless.wiki.kernel.org/en/users/documentation/iw
- Ubiquiti UniFi `mca-dump` references in UniFi Network/UDM CLI docs
- prometheus snmp_exporter README and example config: https://github.com/prometheus/snmp_exporter

## Issues Found
- **Prometheus + SNMP scrape config was non-functional.** The original configuration set `targets: ['controller.example.com:161']` and pointed `metrics_path: /snmp` directly at the SNMP UDP port. Prometheus scrapes over HTTP, so this would fail — the canonical pattern is to have Prometheus scrape `snmp_exporter` over HTTP and pass the SNMP target via the `target` query parameter using `relabel_configs`. Updated the snippet to remove the `:161` port and add the standard `relabel_configs` block routing scrapes to `snmp_exporter:9116`, with `__param_target` and `instance` set from the original `__address__`.

## Review Notes
- The `ubiquiti_unifi` snmp_exporter module is illustrative — there is no module by that exact name shipped by default with snmp_exporter. Users will need to generate one with the snmp_exporter `generator` tool (or use `if_mib`) against the appropriate MIBs. This is a reasonable simplification for a how-to and was left unchanged.
- The dnsmasq lease file format documented in the post (`expiry mac ip hostname client-id`) matches the dnsmasq source/man page.
- `iw dev <iface> station dump` output starts each station block with `Station <MAC> (on <iface>)`, so `grep "^Station" | awk '{print $2}'` correctly extracts MACs.
- The bash `while read mac` loops are functionally correct; using `read -r` would be marginally more robust against backslashes but is not a technical error.
- UniFi UI navigation strings (`Clients → Active Clients`) vary slightly across UniFi Network application versions; the description is close enough to current UI to be useful.
