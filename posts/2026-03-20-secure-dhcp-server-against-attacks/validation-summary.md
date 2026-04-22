# Validation Summary: How to Secure Your DHCP Server Against Attacks

## Status
validated

## Post Type
Technical security guide

## Technologies Covered
- DHCP and DHCPv4
- ISC DHCP server
- Debian/Ubuntu ISC DHCP packaging
- iptables and xt_recent
- OMAPI and TSIG keys
- DHCP snooping
- nmap NSE scripts
- dhcp-probe

## Sources Consulted
- IETF RFC 2131: Dynamic Host Configuration Protocol: https://datatracker.ietf.org/doc/rfc2131/
- ISC DHCP 4.4 dhcpd.conf manual: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP end-of-life dates: https://kb.isc.org/docs/isc-dhcp-eol-dates
- ISC guidance on securing OMAPI access: https://kb.isc.org/docs/aa-01355
- Debian isc-dhcp-server init script source for INTERFACESv4 behavior: https://sources.debian.org/src/isc-dhcp/4.3.5-3%2Bdeb9u1/debian/isc-dhcp-server.init.d/
- iptables-extensions recent module manual: https://www.man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Nmap broadcast-dhcp-discover NSE documentation: https://nmap.org/nsedoc/scripts/broadcast-dhcp-discover.html
- Debian dhcp_probe manual page: https://manpages.debian.org/testing/dhcp-probe/dhcp_probe.8.en.html
- Cisco DHCP snooping and rate limiting documentation: https://www.cisco.com/c/en/us/td/docs/switches/lan/catalyst3650/software/release/3se/consolidated_guide/configuration_guide/b_consolidated_3650_3se_cg/b_consolidated_3650_3se_cg_chapter_01001001.html

## Issues Found
- The firewall example allowed DHCP only from `10.0.0.0/8`, but directly attached DHCP clients can send initial requests from source IP `0.0.0.0`. I changed the example to allow client requests by LAN interface and UDP ports, and kept relay filtering as a separate trusted-relay example.
- The firewall example dropped UDP/68 on WAN, which can break a legitimate DHCP client on that interface. I removed that command and limited the server-side block to UDP/67.
- The `deny unknown-clients` example placed the directive at subnet scope. ISC documents that scope-level use is deprecated for this purpose and recommends pool-level use. I moved it inside a dynamic pool.
- The iptables `recent` example set the source before checking hit count, and the comments overstated per-client behavior. I reordered the rules, clarified that this is aggregate source-IP limiting, and noted that it must be placed before final DHCP accept/drop rules.
- The OMAPI section enabled the management listener without network restriction. I added TCP/7911 firewall rules for trusted admin access and kept the TSIG key requirement.
- The OMAPI key-generation command appended to `/etc/dhcp/dhcpd.conf` with shell redirection that would fail for non-root users. I changed it to pipe through `sudo tee -a`.
- The dhcp-probe example omitted elevated privileges. I added `sudo` because the tool sends and captures raw network traffic.
- The article used ISC DHCP examples without noting that ISC DHCP is end-of-life. I added a brief caveat recommending maintained DHCP software such as Kea for new deployments.

## Review Notes
The corrected examples are still ISC DHCP-oriented and suitable mainly for existing deployments. For new Linux firewall configurations, nftables may be preferable to iptables, but the iptables examples remain technically valid on systems that provide iptables or the iptables-nft compatibility frontend.
