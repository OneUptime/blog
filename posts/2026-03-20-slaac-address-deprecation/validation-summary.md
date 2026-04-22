# Validation Summary: How to Understand SLAAC Address Deprecation

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 SLAAC
- IPv6 Router Advertisements
- IPv6 address preferred and valid lifetimes
- RFC 6724 source address selection
- Linux iproute2, ss, ip6tables
- radvd
- Cisco IOS IPv6 Neighbor Discovery
- macOS ifconfig
- Windows NetTCPIP PowerShell cmdlets
- IPv6 privacy extensions

## Sources Consulted
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://datatracker.ietf.org/doc/html/rfc4862
- RFC 6724: Default Address Selection for IPv6 - https://datatracker.ietf.org/doc/html/rfc6724
- RFC 8981: Temporary Address Extensions for SLAAC - https://datatracker.ietf.org/doc/html/rfc8981
- ip-address(8) Linux manual page - https://man7.org/linux/man-pages/man8/ip-address.8.html
- ip-route(8) Linux manual page - https://man7.org/linux/man-pages/man8/ip-route.8.html
- curl command manual - https://curl.se/docs/manpage.html
- radvd.conf(5) manual page - https://manpages.ubuntu.com/manpages/questing/man5/radvd.conf.5.html
- Cisco IOS IPv6 Command Reference, ipv6 nd prefix - https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/ipv6/command/ipv6-cr-book/ipv6-i3.html
- Microsoft Get-NetIPAddress documentation - https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress
- Microsoft MSFT_NetIPAddress class documentation - https://learn.microsoft.com/en-us/windows/win32/fwp/wmi/nettcpipprov/msft-netipaddress
- GitHub author profile - https://github.com/nawazdhandala

## Issues Found
- RFC 6724 Rule 3 was described as "Prefer appropriate scope"; that is Rule 2. Updated the Rule 3 text to "Avoid deprecated addresses" and clarified that preferred sources win over deprecated sources.
- The introduction and conclusion implied deprecated addresses are never used for new connections. Updated the wording to match RFC 4862/RFC 6724: deprecated sources are avoided when a suitable non-deprecated alternative is available.
- The Linux awk filter for deprecated addresses printed the next address after a `preferred_lft 0sec` line rather than the deprecated address itself. Replaced it with the iproute2-supported `ip -6 addr show deprecated`.
- The curl test did not force IPv6, so it could take an IPv4 path and fail to test IPv6 source address selection. Added `-6`.
- The source-selection test used `strace connect()` output and `ipv6.example.com`. `connect()` shows the destination socket, not the selected local source, and `ipv6.example.com` is not a reliable test hostname. Replaced it with `ip -6 route get ... oif eth0`, which shows the kernel-selected `src`.
- The privacy-extension lifecycle used the old 7-day RFC 4941 temporary address valid lifetime as if it were current. Updated the wording to note the RFC 8981 default valid lifetime of 2 days and avoided claiming the immediately next temporary address is still preferred at invalidation time.
- The long-lived connection impact stated that TCP resets when an address becomes invalid. Changed it to "can reset or time out" because behavior depends on the stack and application.

## Review Notes
The Linux, Cisco IOS, radvd, curl, and Windows examples are syntactically valid after the corrections. Some platforms still ship defaults derived from RFC 4941 or local policy, so observed privacy-address valid lifetimes may differ from RFC 8981 defaults.
