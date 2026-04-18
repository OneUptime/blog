# Validation Summary: How to View IPv6 Addresses with ifconfig on macOS

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- macOS (BSD-derived networking stack)
- `ifconfig` (8) for IPv6 address display
- `ping6` (8) for IPv6 connectivity testing
- `netstat` (1) for routing table inspection
- `traceroute6` (8) for IPv6 path tracing
- `ndp` (8) for Neighbor Discovery Protocol cache
- IPv6 concepts: SLAAC, zone IDs, link-local, ULA, privacy extensions

## Sources Consulted
- macOS `ifconfig(8)` man page (BSD-derived)
- macOS `ndp(8)` man page
- macOS `traceroute(8)` and `traceroute6(8)` man pages
- macOS `netstat(1)` man page
- Apple XNU source, `bsd/netinet6/in6.h` (IN6_IFF_* flag definitions: SECURED, TEMPORARY, DEPRECATED, DYNAMIC, AUTOCONF, TENTATIVE)
- RFC 4862 (IPv6 Stateless Address Autoconfiguration — deprecated/preferred/valid lifetimes)
- RFC 4941 (Privacy Extensions for Stateless Address Autoconfiguration in IPv6)
- RFC 4193 (Unique Local IPv6 Unicast Addresses — fc00::/7, fd00::/8)
- RFC 4007 (IPv6 Scoped Address Architecture — zone IDs, `%interface` syntax)
- RFC 3972 (Cryptographically Generated Addresses)

## Issues Found

1. **`traceroute -6` does not exist on macOS** — The post suggested `traceroute -6 2001:4860:4860::8888` as an alternative to `traceroute6`. The `-6` flag is Linux/iputils-specific; macOS's BSD-derived `traceroute(8)` does not support IPv6 and will produce a usage error. Removed the line and kept only `traceroute6`.

2. **`ndp -i en0 -a` combines conflicting modes** — The post suggested this command to show neighbors on a specific interface. In macOS/BSD `ndp(8)`, `-i interface` is a mutually-exclusive mode for viewing or modifying NDP parameters of an interface, not for filtering the neighbor cache. The correct way to filter the neighbor cache by interface is `ndp -a | grep en0`. Updated accordingly.

## Review Notes

- The `secured` flag is described as CGA (RFC 3972). Apple's own XNU header comment uses the phrase "Cryptographically Generated Address" for `IN6_IFF_SECURED`, though in practice Apple's implementation follows stable-privacy-address conventions closer to RFC 7217. The post's wording matches Apple's own terminology, so no change was made.
- The comment `preferred_lft expired but valid_lft not expired` uses Linux `ip`-style terminology. macOS typically refers to these as "preferred lifetime" and "valid lifetime" (RFC 4862). The meaning is still correct, so left as-is.
- The `cut -d'/' -f1` pipe step is redundant on macOS because `ifconfig` displays `prefixlen N` rather than CIDR slash notation; however, it is harmless and becomes useful when the same one-liner is reused across systems. Left as-is.
- The sample error string `ping6: UDP connect: No route to host` is plausible for older macOS versions; recent macOS may emit `ping6: sendmsg: No route to host` or a similar variant depending on version. The core point (zone ID is required for link-local) is accurate.
- `scopeid 0x4` in the sample output is illustrative; the actual scope ID varies with interface index on each system.
