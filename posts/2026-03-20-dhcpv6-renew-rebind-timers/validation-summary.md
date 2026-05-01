# Validation Summary: How to Understand DHCPv6 Renew and Rebind Timers

## Status
validated

## Post Type
Guide

## Technologies Covered
- DHCPv6
- IPv6 addressing and lifetimes
- Linux `ip` command
- ISC DHCP server (`dhcpd6.conf`)
- ISC `dhclient`

## Sources Consulted
- RFC 9915, Dynamic Host Configuration Protocol for IPv6 (DHCPv6): https://www.rfc-editor.org/rfc/rfc9915.html
- RFC 8415 information page, noting it is obsoleted by RFC 9915: https://www.rfc-editor.org/info/rfc8415
- ISC DHCP 4.4 manual page for `dhcpd.conf`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhcpdconf
- ISC DHCP 4.4 manual page for `dhclient`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclient
- ISC DHCP 4.4 manual page for `dhclient.conf`: https://kb.isc.org/docs/isc-dhcp-44-manual-pages-dhclientconf
- `ip-address(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-address.8.html

## Issues Found
- The post described Renew as a unicast exchange. I changed that wording because RFC 9915 obsoletes the Server Unicast option and states that DHCPv6 clients send messages to `ff02::1:2`; Renew is tied to the original server by the Server Identifier option, while Rebind can be answered by any server.
- The post presented T1 and T2 as fixed defaults based on valid lifetime. I corrected this to server-selected values, with the RFC recommendation being 0.5 and 0.8 times the shortest preferred lifetime.
- The ISC DHCP example used timer values derived from the valid lifetime. I updated the example to use values derived from the configured 2700-second preferred lifetime and adjusted the explanatory comments to match.
- The Linux `ip` section implied that `ip` exposes T1 and T2 directly. I clarified that `ip` shows preferred and valid lifetimes, while T1 and T2 are tracked by the DHCP client.
- The `dhclient` lease-file path was presented as fixed. I qualified it as an example path because ISC documents the lease file as configurable via `-lf`, and packaged defaults vary by distribution.
- The ISC DHCP subnet example used `2001:db8::/32` for an address-pool example. I changed it to `/64` so the example matches a normal on-link IPv6 subnet and the `/64` address example shown elsewhere in the post.

## Review Notes
- ISC DHCP and ISC `dhclient` are end-of-life according to ISC documentation. The configuration syntax referenced in the post is still documented, but future revisions may be stronger with a Kea or contemporary Linux DHCPv6 client example.
- I verified the commands and configuration against official documentation, but I could not run `dhcpd` syntax validation locally because `dhcpd` is not installed in this environment.
