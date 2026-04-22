# Validation Summary: How SLAAC Handles Multiple Prefixes

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- IPv6 Router Advertisements and Prefix Information Options
- RFC 6724 source address selection
- IPv6 Unique Local Addresses (ULA) and Global Unicast Addresses (GUA)
- Linux iproute2 commands (`ip addrlabel`, `ip route`)
- radvd prefix configuration
- curl IPv6 interface binding
- Python `socket` source-address inspection

## Sources Consulted
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 6724, Default Address Selection for IPv6: https://datatracker.ietf.org/doc/html/rfc6724
- RFC 4193, Unique Local IPv6 Unicast Addresses: https://datatracker.ietf.org/doc/html/rfc4193
- RFC 3849, IPv6 Documentation Prefix (`2001:db8::/32`): https://datatracker.ietf.org/doc/html/rfc3849
- RFC 7217, Stable and Opaque Interface Identifiers with SLAAC: https://datatracker.ietf.org/doc/html/rfc7217
- RFC 8981, Temporary Address Extensions for SLAAC: https://datatracker.ietf.org/doc/html/rfc8981
- radvd.conf manual: https://manpages.debian.org/testing/radvd/radvd.conf.5.en.html
- Linux `ip-addrlabel(8)` manual: https://man7.org/linux/man-pages/man8/ip-addrlabel.8.html
- Linux `ip-route(8)` manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- curl man page: https://curl.se/docs/manpage.html
- Python `socket` documentation: https://docs.python.org/3/library/socket.html

## Issues Found
- The renumbering example used invalid IPv6 text (`2001:db8:old::/64` and `2001:db8:new::/64`). Changed these to valid documentation prefixes, `2001:db8:0:1::/64` and `2001:db8:0:2::/64`.
- The introduction and conclusion stated that SLAAC generates exactly one address per prefix. Updated this to one or more addresses per autonomous advertised prefix, accounting for stable and temporary addresses.
- The ULA examples used `fd00::/64`. Replaced them with `fd12:3456:789a::/64` to show a more realistic locally assigned ULA-style prefix.
- The post described `2001:db8::/64` as internet-routable. Clarified that it is a documentation GUA example and that real deployments must use a routed prefix.
- The RFC 6724 source-selection rule list omitted Rule 5.5 and overstated tie behavior. Added Rule 5.5 and corrected the implementation-specific tiebreaker language.
- The policy-table section used `ip -6 rule show` to view source-selection policy. Replaced it with `ip addrlabel list`, and clarified that `ip rule` is routing policy, not address-selection policy.
- The policy-table explanation implied the kernel hardcodes the full RFC 6724 table. Clarified that source selection uses labels, destination sorting uses precedence, and Linux exposes/configures these through different mechanisms.
- The ULA/GUA explanation said Rule 2 scope helps prefer GUA over ULA for internet destinations. Corrected this because RFC 6724 treats ULAs as global scope; label matching is the relevant rule when both GUA and ULA are available.
- The source-routing example used `ip rule add from ...` as if it selected a preferred source address. Replaced it with `ip -6 route get` for inspection and an `ip -6 route add ... src ...` example for route preferred source.
- The ULA internet-reachability note implied a ULA source could work directly. Corrected it to state that ULA sources usually fail for internet destinations unless translated.

## Review Notes
- The examples still use documentation addresses, so operators must replace them with addresses assigned to their hosts before running the commands.
- Linux distributions can expose address labels and user-space destination precedence differently; the post now calls out the `ip addrlabel` versus `/etc/gai.conf` distinction.
- Python snippets were syntax-checked locally. Network-dependent examples were not executed against live IPv6 connectivity because they use documentation prefixes and environment-specific routes.
