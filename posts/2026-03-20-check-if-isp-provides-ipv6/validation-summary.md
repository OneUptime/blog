# Validation Summary: How to Check If Your ISP Provides IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 connectivity testing
- Home router WAN status and DHCPv6 prefix delegation
- Windows networking tools (`ipconfig`, `ping`, `nslookup`)
- macOS networking tools (`ifconfig`, `ping6`, `curl`)
- Linux networking tools (`ip`, `ping`, `dig`)
- BGP and ASN visibility

## Sources Consulted
- Microsoft Learn: `ipconfig` — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ipconfig
- Microsoft Learn: `ping` — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Microsoft Learn: `nslookup` — https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/nslookup
- RFC 7084, Basic Requirements for IPv6 Customer Edge Routers — https://www.rfc-editor.org/rfc/rfc7084
- RFC 8415, Dynamic Host Configuration Protocol for IPv6 (DHCPv6) — https://www.rfc-editor.org/rfc/rfc8415
- RFC 4291, IP Version 6 Addressing Architecture — https://www.rfc-editor.org/rfc/rfc4291
- IANA IPv6 Address Space — https://www.iana.org/assignments/ipv6-address-space
- Test your IPv6 — https://test-ipv6.com/
- Test your IPv6 FAQ: no IPv6 detected — https://test-ipv6.com/faq_no_ipv6.html
- Hurricane Electric Free IPv6 Tunnel Broker — https://tunnelbroker.net/
- curl man page — https://curl.se/docs/manpage.html
- Local CLI help and live command checks in the review environment: `ping -h`, `dig -h`, `curl --help all`, `ip -6 addr show scope global`, `ip -6 route show default`, `curl -6 https://ipv6.icanhazip.com`, `nslookup -type=AAAA ipv6.google.com`, `dig AAAA ipv6.google.com`, and `curl -s https://ipinfo.io/json | python3 -m json.tool | grep org`

## Issues Found
- The Windows connectivity example used `ping -6`, but Windows `ping` uses `/6`. I changed it to `ping /6 ipv6.google.com` to match Microsoft documentation.
- The Windows and Linux DNS lookup descriptions implied that an AAAA lookup proves IPv6 routing. I changed those lines to say they confirm AAAA-record resolution, because DNS can succeed without proving end-to-end IPv6 Internet connectivity.
- The router WAN example implied that native IPv6 always requires a global IPv6 address on the WAN interface. I updated the explanation and example to account for ISPs that delegate a prefix while showing only a link-local WAN address.
- The results table treated `fe80::` on the WAN as proof that the ISP does not provide IPv6. I corrected that to require both link-local-only WAN addressing and no delegated prefix before making that conclusion.
- The `test-ipv6.com` score explanation and conclusion overstated what the site proves about the ISP specifically. I rewrote that wording to distinguish end-to-end device connectivity from ISP-only support.
- The Linux connectivity example used `ping6`; I updated it to `ping -6` to match the current documented option syntax of the installed `ping` implementation used for verification.

## Review Notes
- The macOS `ifconfig en0` example assumes the active interface is `en0`, which is common but not universal on all Macs. A future revision could mention checking the active interface name first.
- `test-ipv6.com` responded successfully during review. `whatismyipv6.com` and `ipv6-test.com` resolved in DNS but were slow or unresponsive from the current environment during spot checks, so their availability may be less consistent.
