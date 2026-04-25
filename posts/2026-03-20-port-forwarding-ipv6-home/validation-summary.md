# Validation Summary: How to Set Up Port Forwarding with IPv6 at Home

## Status
validated

## Post Type
Guide / Tutorial

## Technologies Covered
- IPv6
- Home router firewalls
- OpenWrt firewall/UCI
- ASUSWRT
- Ubiquiti UniFi
- TP-Link router UI
- Dynamic DNS (Hurricane Electric)
- Linux networking CLI (`ip`, `nc`, `curl`, `nmap`)

## Sources Consulted
- OpenWrt Firewall configuration `/etc/config/firewall` - https://openwrt.org/docs/guide-user/firewall/firewall_configuration
- OpenWrt `odhcpd` documentation - https://openwrt.org/docs/techref/odhcpd
- ASUS official IPv6 Firewall setup FAQ - https://www.asus.com/support/faq/1013638/
- Ubiquiti Zone-Based Firewalls in UniFi - https://help.ui.com/hc/en-us/articles/115003173168-Zone-Based-Firewalls-in-UniFi
- Ubiquiti UniFi Gateway Advanced Firewall Rules - https://help.ui.com/hc/en-us/articles/27699646208279-UniFi-Gateway-Advanced-Firewall-Rules
- TP-Link user guide section "Set up IPv6 Firewall Rules" - https://www.tp-link.com/ca/document/111262/
- Hurricane Electric dynamic DNS documentation - https://dns.he.net/docs
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862
- RFC 8981: Temporary Address Extensions for Stateless Address Autoconfiguration in IPv6 - https://www.rfc-editor.org/rfc/rfc8981
- RFC 6296: IPv6-to-IPv6 Network Prefix Translation - https://www.rfc-editor.org/rfc/rfc6296
- Nmap IPv6 scanning documentation - https://nmap.org/book/port-scanning-ipv6.html
- Local CLI help checked during review: `ip address help`, `curl --help all`, `nc -h`

## Issues Found
- The example IPv6 literal `2001:db8:home::10` was invalid because `home` is not hexadecimal. I replaced it with the documentation-safe address `2001:db8:1::10`.
- The post treated IPv6 as having "no NAT" in all cases. I changed that to "usually no NAT" for typical home deployments, because IPv6 NAT/NPTv6 exists even though it is not the normal model.
- The SLAAC note implied any SLAAC address is unstable. I clarified that the main issue is temporary/privacy addresses and changed the recommendation to "static or reserved" rather than only "static."
- The ASUS, UniFi, and TP-Link UI steps were too specific or outdated relative to current vendor documentation. I updated them to match current official terminology and controller/firmware-dependent layouts.
- The HTTPS `curl` test used a raw IPv6 literal without accounting for certificate validation. I added `-k` and an explanatory note so the command works as a connectivity check when the certificate does not match the literal IP.
- The DDNS example could return multiple or temporary IPv6 addresses. I updated it to select the first non-temporary global IPv6 address from `ip -6 -o addr show`.
- The `/128 reservation` wording was misleading. I replaced it with DHCPv6 reservation / fixed host identifier wording that better matches current router behavior and OpenWrt documentation.

## Review Notes
- Vendor UI labels vary by model, firmware, and controller version, especially on UniFi and TP-Link; the revised post now uses version-tolerant wording.
- The `nmap` example is technically valid, but it assumes the test host itself has working IPv6 connectivity.
