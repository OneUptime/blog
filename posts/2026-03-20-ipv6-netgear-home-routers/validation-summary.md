# Validation Summary: How to Configure IPv6 on Netgear Home Routers - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- DHCPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- SLAAC
- Netgear Nighthawk routers
- Netgear Orbi mesh systems
- Linux networking tools (`ip`, `ping`, `dig`, `curl`)

## Sources Consulted
- NETGEAR Support: How do I set up a IPv6 Internet connection with a DHCP server on my Nighthawk router? https://kb.netgear.com/24013/How-do-I-set-up-a-IPv6-Internet-connection-with-a-DHCP-server-on-my-Nighthawk-router
- NETGEAR Support: How do I use auto detection to set up an IPv6 Internet connection on my Nighthawk router? https://kb.netgear.com/24008/How-do-I-use-auto-detection-to-set-up-an-IPv6-Internet-connection-on-my-Nighthawk-router
- NETGEAR R7000 User Manual PDF: https://www.downloads.netgear.com/files/GDC/R7000/R7000_UM.pdf
- NETGEAR Orbi WiFi System User Manual PDF: https://www.downloads.netgear.com/files/GDC/RBK50/Orbi_UM_EN.pdf
- NETGEAR Support: Does my Orbi WiFi System support Internet Protocol version 6 (IPv6)? https://kb.netgear.com/31073/Does-Orbi-support-Internet-Protocol-version-6-IPv6
- NETGEAR Support: How do I set up my Orbi WiFi System? https://kb.netgear.com/31017/How-do-I-set-up-my-Orbi-WiFi-System
- NETGEAR Support: Which features are disabled on my Orbi router when it is set to AP Mode https://kb.netgear.com/000061277/Which-features-are-disabled-on-my-Orbi-router-when-it-is-set-to-AP-Mode
- RFC 4862: IPv6 Stateless Address Autoconfiguration https://datatracker.ietf.org/doc/html/rfc4862
- RFC 8106: IPv6 Router Advertisement Options for DNS Configuration https://datatracker.ietf.org/doc/html/rfc8106
- RFC 8415: Dynamic Host Configuration Protocol for IPv6 (DHCPv6) https://www.rfc-editor.org/rfc/rfc8415
- ifconfig.co FAQ and endpoint behavior: https://ifconfig.co/
- Local CLI help output: `ping -h`, `dig -h`, `curl --help all`, `ip -V`

## Issues Found
- The post used several Netgear GUI labels that do not match the documented IPv6 screens, including `DHCPv6`, `Prefix delegation`, `IPv6 Mode`, `Enable RDNSS`, `Advertise IPv6 prefix to LAN`, `Use DHCP for DNS`, and `Enable IPv6 address on LAN`. I replaced them with documented fields such as `DHCP`, `IPv6 DNS Address`, `IP Address Assignment`, `Use This Interface ID`, and `IPv6 Filtering`.
- The Orbi login guidance was too narrow. I corrected it to note that newer Orbi models use `orbilogin.local`, while older ones use `orbilogin.com`.
- The shell verification section assumed stock Netgear firmware exposed SSH and used specific internals such as `eth0`, `radvd`, and `/tmp/radvd.conf`. Those assumptions are not generally valid on stock firmware, so I rewrote the section to make SSH explicitly custom-firmware-only and kept the commands interface-agnostic.
- The troubleshooting section referred to an explicit `DHCPv6` mode, a non-existent LAN checkbox, and a firewall rule check for router advertisements. I replaced those with the documented `DHCP` connection type, the `IP Address Assignment` setting, and the AP mode caveat for Orbi.
- The MTU recommendation for PPPoE was incorrect at `1452`. I corrected it to the commonly documented PPPoE MTU of `1492` unless the ISP specifies otherwise.
- The post claimed users could set a shorter DHCP renewal interval on Netgear stock firmware. That setting is not exposed in the documented UI, so I removed it.
- The client-side connectivity test used `ping6`; I updated it to `ping -6`, which matches current `ping` usage, and changed the `dig` example to `dig -6` to make the IPv6 transport explicit.
- The conclusion overstated prefix-delegation and firewall behavior. I rewrote it to reflect that Netgear handles delegated prefixes automatically when provided by the ISP, clients typically use `Auto Config`/SLAAC on the LAN, and the relevant default security setting is `IPv6 Filtering: Secured`.

## Review Notes
- Netgear's exact IPv6 option list varies by model and firmware generation, so broad posts like this should prefer documented field names and avoid model-specific UI labels unless a specific model or firmware version is named.
- `6to4 Tunnel` is legacy and should remain a last-resort option only when specifically required.
- `ifconfig.co` is a third-party test endpoint, not a Netgear service, but the URL and `curl -6` usage are valid for checking the public-facing IPv6 address.
