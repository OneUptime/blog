# Validation Summary: How to Understand SLAAC Address Lifetimes

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- Router Advertisements and Prefix Information options
- IPv6 address valid and preferred lifetimes
- Linux iproute2 `ip address`
- macOS `ifconfig` and `ndp`
- Windows PowerShell NetTCPIP cmdlets
- radvd configuration

## Sources Consulted
- RFC 4862: IPv6 Stateless Address Autoconfiguration, especially Sections 5.5.3 and 5.5.4: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 4861: Neighbor Discovery for IPv6, including advertised prefix lifetime defaults and renumbering considerations: https://datatracker.ietf.org/doc/html/rfc4861
- Debian iproute2 `ip-address(8)` man page: https://manpages.debian.org/unstable/iproute2/ip-address.8.en.html
- Debian radvd `radvd.conf(5)` man page: https://manpages.debian.org/unstable/radvd/radvd.conf.5.en.html
- Microsoft Learn `Get-NetIPAddress` documentation: https://learn.microsoft.com/en-us/powershell/module/nettcpip/get-netipaddress
- Microsoft Learn `MSFT_NetIPAddress` class documentation: https://learn.microsoft.com/en-us/previous-versions/windows/desktop/legacy/hh872425(v=vs.85)
- Xcode/macOS `ndp(8)` man page mirror: https://keith.github.io/xcode-man-pages/ndp.8.html

## Issues Found
- Deprecated-address behavior was too absolute. Updated the wording to match RFC 4862: deprecated addresses are avoided for new communications when a suitable preferred address exists, but existing traffic can continue.
- Invalid-address behavior claimed existing connections receive a reset. Updated it to say connections fail or time out, because the exact failure mode is not guaranteed.
- The RFC 4862 valid-lifetime update rules were incomplete. Added the `RemainingLifetime <= 2 hours` ignore case, the authenticated-RA exception, the correct `>` comparison against remaining lifetime, and the rule that preferred lifetime is reset from the received Prefix Information option.
- The `ValidLifetime = 0` explanation implied immediate removal. Updated it to account for the two-hour floor on unauthenticated Router Advertisements.
- The macOS section incorrectly described lifetime display and suggested `scutil`. Replaced it with `ndp -p`, which exposes `vltime`, `pltime`, and `expire` for the Neighbor Discovery prefix list.
- The Windows section described lifetimes as seconds and did not focus on SLAAC entries. Updated it to filter `PrefixOrigin RouterAdvertisement` and describe `ValidLifetime` and `PreferredLifetime` as `TimeSpan` values.
- The renumbering withdrawal procedure omitted the RFC 4862 two-hour floor and the need to continue advertising withdrawal information. Updated Phase 3 accordingly.

## Review Notes
Linux command syntax and the AWK lifetime-conversion snippet were checked locally. Current radvd defaults differ from the RFC 4861 suggested defaults, but the post explicitly configures the RFC-sized lifetimes, so the radvd example is valid.
