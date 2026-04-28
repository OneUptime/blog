# Validation Summary: How to Set Up NAT with pfSense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- pfSense (web GUI configuration)
- NAT (Outbound NAT, Port Forwarding / DNAT, 1:1 NAT)
- pf state table / firewall states
- pfSense `config.xml`

## Sources Consulted
- [pfSense Documentation - Network Address Translation](https://docs.netgate.com/pfsense/en/latest/nat/index.html)
- [pfSense Documentation - Outbound NAT](https://docs.netgate.com/pfsense/en/latest/nat/outbound.html)
- [pfSense Documentation - Firewall Logs](https://docs.netgate.com/pfsense/en/latest/monitoring/logs/firewall.html)
- [pfSense Documentation - Viewing Firewall States in the GUI](https://docs.netgate.com/pfsense/en/latest/monitoring/status/firewall-states-gui.html)

## Issues Found

1. **Incorrect menu path for firewall logs.** The post listed "Status → Firewall Logs". The actual pfSense menu path is **Status → System Logs** with a **Firewall** tab. Updated the line to "Status → System Logs → Firewall".

2. **Incorrect states-table example.** The original example showed `192.168.1.10:54321 → 203.0.113.1:80 → 8.8.8.8:80`, which mixes a destination port (`:80`) into the translated source column and is not a format pfSense actually emits. Per the Netgate "Viewing Firewall States" documentation, source-NAT entries are rendered as `translated_source (original_source) → destination`. Replaced the example with `203.0.113.1:54321 (192.168.1.10:54321) → 8.8.8.8:80` and updated the column header accordingly.

3. **Misleading subsection heading.** The heading "pfSense Port Forward CLI (using php)" claimed a PHP-based workflow, but the snippet only references editing `/cf/conf/config.xml` — no PHP is shown or invoked. Renamed to "pfSense Port Forward via Config" so the heading matches the snippet.

## Review Notes
- pfSense actually exposes four Outbound NAT modes: Automatic, Hybrid, Manual, and Disable. The post only mentions Automatic and Manual; this is acceptable for an introductory tutorial but the author could note Hybrid mode in a future revision (it's the most-recommended mode when adding manual rules on top of the defaults).
- The XML snippet under "Outbound NAT via XML Config" is a simplified illustration; pfSense's real `config.xml` schema for outbound NAT rules is richer (includes `<source>`, `<destination>`, `<dstport>`, `<target>`, `<descr>`, etc.). It's reasonable as pseudocode but not a drop-in config.
- The 1:1 NAT field labels in the pfSense GUI are technically "External subnet IP" and "Internal IP"; the post uses "External IP" / "Internal IP" which is a minor simplification but communicates the concept clearly.
- pfSense also supports NPt (IPv6 prefix translation) and NAT64; both are outside the scope of this IPv4-focused post and were appropriately omitted.
