# Validation Summary: How to Troubleshoot IPv6 Connectivity on macOS

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- IPv6 addressing and routing
- macOS network troubleshooting commands
- ICMPv6 ping and traceroute diagnostics
- DNS AAAA resolution with dig
- macOS networksetup, tcpdump, pf, and Application Firewall tools

## Sources Consulted
- Apple Support, "Use IPv6 on Mac": https://support.apple.com/is-is/guide/mac-help/mchlp2499/mac
- Apple Developer, "Recording a Packet Trace": https://developer.apple.com/documentation/network/recording-a-packet-trace
- Apple Developer, "Supporting IPv6-only Networks": https://developer.apple.com/support/ipv6/
- macOS ping6(8) manual page: https://manp.gs/mac/8/ping6
- macOS networksetup(8) manual page: https://manp.gs/mac/8/networksetup
- macOS route(8) manual page: https://manp.gs/mac/8/route
- macOS traceroute6(8) manual page: https://manp.gs/mac/8/traceroute6
- macOS traceroute(8) manual page: https://manp.gs/mac/8/traceroute
- macOS ifconfig(8) manual page: https://manp.gs/mac/8/ifconfig
- macOS pfctl(8) manual page: https://manp.gs/mac/8/pfctl
- macOS socketfilterfw(8) manual page: https://manp.gs/mac/8/socketfilterfw
- IANA IPv6 Address Space registry: https://www.iana.org/assignments/ipv6-address-space
- RFC 4291, IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 4861, Neighbor Discovery for IP version 6: https://www.rfc-editor.org/rfc/rfc4861
- ISC BIND 9 dig manual: https://bind9.readthedocs.io/en/v9.18.26/manpages.html#dig-dns-lookup-utility
- curl IPv6 manual: https://github.com/curl/curl/blob/master/docs/MANUAL.md#ipv6
- Google Public DNS64 documentation, noting Google Public DNS IPv6 resolver addresses: https://developers.google.com/speed/public-dns/docs/dns64

## Issues Found
- The post described global IPv6 addresses as starting with `2xxx` or `fcxx`. I corrected this to state that current global unicast allocation is `2000::/3` (`2xxx` or `3xxx`) and that `fcxx`/`fdxx` is Unique Local Address space, not Internet-routable global unicast.
- The post suggested `traceroute -6`, but the current macOS `traceroute(8)` manual page does not list a `-6` option. I replaced it with `traceroute6 -I`, which is a valid macOS ICMPv6 probe mode.
- The traceroute interpretation was too absolute. I changed the comments to note that missing hops can also mean filtering or rate limiting, not only routing failure.
- The firewall troubleshooting section treated the macOS Application Firewall as an outbound IPv6 blocker. I corrected the cause to pf rules, VPNs, or security software, added a pf rules check, and clarified that Application Firewall mainly controls incoming app connections.
- The pf rules grep used only `ipv6`, which can miss pf rules written with the `inet6` address-family keyword. I changed it to `grep -Ei 'inet6|ipv6'`.
- The Network Diagnostics section pointed to "Renew DHCP Lease" as a way to open diagnostics. I corrected it to Wireless Diagnostics and pointed IPv6 configuration checks to the TCP/IP details pane.
- The summary said to check for a global address with a broad `ifconfig | grep inet6` command. I changed it to "check IPv6 address assignment" to match what the command actually shows.

## Review Notes
The remaining commands are generally valid for macOS, but several are environment-dependent: link-local addresses need the correct interface zone such as `%en0`, network service names may differ from `Wi-Fi`, and manual route changes may be temporary. The post now reflects these caveats without changing its structure.
