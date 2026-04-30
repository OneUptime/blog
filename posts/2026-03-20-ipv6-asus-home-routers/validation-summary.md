# Validation Summary: How to Configure IPv6 on ASUS Home Routers - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- ASUSWRT
- Asuswrt-Merlin
- IPv6
- DHCPv6 Prefix Delegation (DHCPv6-PD)
- SLAAC
- Router Advertisements (RA / radvd)
- IPv6 firewall rules
- DNS over IPv6 / RDNSS

## Sources Consulted
- ASUS official FAQ: IPv6 setup on ASUS routers: https://www.asus.com/support/faq/113990/
- ASUS official FAQ: IPv6 firewall setup on ASUS routers: https://www.asus.com/us/support/faq/1013638/
- Asuswrt-Merlin official wiki: Custom config files: https://github.com/RMerl/asuswrt-merlin/wiki/Custom-config-files
- Asuswrt-Merlin documentation mirror: Custom config files: https://github-wiki-see.page/m/RMerl/asuswrt-merlin.ng/wiki/Custom-config-files
- Asuswrt-Merlin documentation mirror: User scripts: https://github-wiki-see.page/m/RMerl/asuswrt-merlin.ng/wiki/User-scripts
- RFC 2516, PPPoE MTU limits: https://www.rfc-editor.org/rfc/rfc2516
- RFC 4861, IPv6 Neighbor Discovery / Router Advertisement MTU option: https://www.rfc-editor.org/rfc/rfc4861
- RFC 8106, IPv6 Router Advertisement DNS options (RDNSS): https://www.rfc-editor.org/rfc/rfc8106
- BusyBox `nslookup` help output checked locally for `-type=AAAA` syntax
- BusyBox `logread`, `grep`, `find`, and `ping` help output checked locally for command syntax used in the post

## Issues Found
- The post described `Native with DHCP-PD` as an ASUS IPv6 connection type. ASUSWRT uses `Native` as the connection type and exposes `DHCP-PD` as a separate toggle, so the text was corrected accordingly.
- The connection-type list was incomplete and implied a fixed set. It was updated to reflect current common ASUSWRT options documented by ASUS, including `Passthrough` and `Tunnel 6rd`, while keeping the wording model-safe.
- The recommended DNS example manually set IPv6 DNS servers without disabling automatic DNS. The post was corrected to set `Connect to DNS Server automatically: No` when manual DNS servers are specified.
- The GUI field `Enable DHCPv6 Server: Yes (stateless)` did not match current ASUSWRT terminology. It was corrected to `Auto Configuration Setting: Stateless`.
- The Merlin CLI examples hardcoded `eth0` as the WAN interface, which is not portable across ASUS models and WAN types. They were changed to derive the active WAN interface from the IPv6 default route.
- The Merlin CLI examples referenced a specific `odhcp6c` log file path that was not verified. That was replaced with a `logread`-based check for recent IPv6/DHCPv6 messages.
- The custom `radvd` section omitted the requirement to enable JFFS custom scripts/configs in Merlin before `.add` files are honored. That prerequisite was added.
- The sample `AdvLinkMTU 1480` value was too general for PPPoE. It was corrected to a typical PPPoE value of `1492`, with a note about RFC 4638 jumbo-frame exceptions.
- The IPv6 firewall path was wrong. ASUS documents IPv6 firewall configuration under `Firewall -> General`, not `IPv6 -> IPv6 Firewall`, so the path and surrounding text were corrected.
- The firewall example used incorrect field names (`Source IP`, `Dest IP`, `Port`) and an invalid IPv6 address (`2001:db8:home:1::server`). These were corrected to ASUS’s documented field names and a syntactically valid documentation-prefix address.

## Review Notes
- ASUS notes that available IPv6 options and UI labels can vary by router model and firmware version.
- The `Passthrough` versus `Native` choice depends on WAN type and ISP behavior; the post now avoids claiming a single setting is correct for all ISPs.
