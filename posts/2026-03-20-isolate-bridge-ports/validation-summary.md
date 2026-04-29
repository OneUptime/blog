# Validation Summary: How to Isolate Bridge Ports from Each Other

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux bridge
- `iproute2` (`ip link`, `bridge`)
- `ebtables`
- `nftables`
- TAP interfaces / VM networking

## Sources Consulted
- Linux kernel bridge documentation: https://docs.kernel.org/networking/bridge.html
- Linux kernel `rt-link` netlink spec: https://docs.kernel.org/netlink/specs/rt-link.html
- Netfilter nftables bridge filtering documentation: https://wiki.nftables.org/wiki-nftables/index.php/Bridge_filtering
- Netfilter nftables man page: https://netfilter.org/projects/nftables/manpage.html
- Netfilter `ebtables` man page source: https://git.netfilter.org/ebtables/tree/ebtables.8?id=aac311473fb4753db236e40f3f5c3865e491cb56
- Local system man pages consulted for command syntax and semantics: `man ip-link`, `man bridge`, `man ebtables`, `man nft`

## Issues Found
- The description said the post used "VLAN-based private isolation", but the actual methods shown were `ebtables`, `nftables`, and the Linux bridge `isolated` port flag. I corrected the description to match the implementation details actually covered.
- The opening explanation overstated the behavior by implying port isolation always forces inter-host traffic through the router. I clarified that this is true when the only non-isolated path is the uplink/router.
- The `ebtables` example claimed it was allowing traffic only to or from a gateway MAC and declared `GATEWAY_MAC`, but the rules were interface-based and did not match on MAC address at all. I removed the misleading comment and unused variable.
- The `ip link` section and key takeaways claimed the `isolated` bridge port flag was "Kernel 5.10+". I removed that hard version claim because the feature is documented in current official kernel and `iproute2` documentation, but that exact minimum version was not verified from the primary sources used in this review.
- The verification text said the gateway "is on eth0". I corrected that to say the gateway is reachable via `eth0`, which is the technically accurate description for an uplink bridge port.

## Review Notes
- The `isolated` bridge-port behavior itself is correct: isolated ports can communicate with non-isolated ports only.
- The `nftables` bridge-family example is syntactically consistent with the documented `bridge` `forward` hook and `iifname`/`oifname` matches.
- `ebtables` remains valid for legacy setups, but Netfilter documents nftables as the modern replacement for `{ip,ip6,arp,eb}tables`.
