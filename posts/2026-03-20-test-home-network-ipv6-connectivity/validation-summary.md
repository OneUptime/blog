# Validation Summary: How to Test Your Home Network IPv6 Connectivity

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- IPv6 addressing and routing
- IPv6 prefix delegation
- OpenWrt `ifstatus` and Linux `ip`
- Windows PowerShell `Get-NetIPAddress` and `ipconfig`
- macOS/Linux `ifconfig` and `grep` filtering
- DNS AAAA lookups with `dig` and `nslookup`
- IPv6 application testing with `curl`
- test-ipv6.com

## Sources Consulted
- RFC 4291: IP Version 6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- IANA IPv6 Global Unicast Address Assignments: https://www.iana.org/assignments/ipv6-unicast-address-assignments/ipv6-unicast-address-assignments.xhtml
- RFC 3849: IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4861: Neighbor Discovery for IP version 6: https://datatracker.ietf.org/doc/html/rfc4861
- OpenWrt IPv6 configuration guide: https://openwrt.org/docs/guide-user/network/ipv6/configuration
- Microsoft Learn `Get-NetIPAddress`: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress
- BIND 9 manual pages for `dig`: https://bind9.readthedocs.io/en/v9.18.45/manpages.html
- curl man page and IPv6 tutorial: https://curl.se/docs/manpage.html and https://curl.se/docs/tutorial.html
- Google Public DNS documentation: https://developers.google.com/speed/public-dns/docs/using
- test-ipv6.com test description and FAQ: https://test-ipv6.com/ and https://test-ipv6.com/faq.html
- Local command help/output for `ip -6 addr`, `ip -6 route`, `dig -h`, and `curl --help all`

## Issues Found
- The post implied a router WAN must show a global `2xxx:` IPv6 address. Corrected this to allow either a global IPv6 address or delegated prefix, and noted that a `fe80::` link-local gateway/default route is normal in IPv6.
- The OpenWrt WAN example used `ip -6 addr show wan`, which may not match OpenWrt logical interfaces. Replaced it with `ifstatus wan6` and kept `ip -6 route show default`.
- The prefix delegation section assumed an ISP-delegated `/56`. Changed it to refer generally to the ISP-delegated prefix because ISPs commonly delegate different prefix lengths.
- The examples used `2001:db8::/32` as if it could be an expected live address. Clarified that `2001:db8::/32` is documentation-only and that real networks will use a different prefix.
- The macOS command claimed to show global IPv6 addresses but only excluded link-local `fe80::` addresses, so it could include loopback or ULA addresses. Updated it to filter currently allocated global-unicast addresses in `2000::/3`.
- The DNS-over-IPv6 test did not explicitly force IPv6 transport. Added `dig -6` when querying Google Public DNS over `2001:4860:4860::8888`.
- The test-ipv6.com bullet list described “IPv4 fallback (Happy Eyeballs)” and generic “DNS over IPv6.” Adjusted those to match the site’s actual dual-stack/fallback and ISP DNS resolver IPv6 capability checks more closely.

## Review Notes
The Linux `ip -6 addr show scope global` command is valid, but Linux can also mark ULA addresses as `scope global`; readers should still confirm the address is in the currently allocated global-unicast range (`2000::/3`) when testing public IPv6 connectivity.
