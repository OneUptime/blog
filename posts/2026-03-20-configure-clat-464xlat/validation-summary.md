# Validation Summary: How to Configure CLAT (Customer-Side Translator) for 464XLAT

## Status
validated

## Post Type
Guide

## Technologies Covered
- 464XLAT
- CLAT
- NAT64 / PLAT
- IPv6
- Linux networking
- `clatd`
- Jool SIIT
- `iproute2`

## Sources Consulted
- RFC 6877, 464XLAT: https://datatracker.ietf.org/doc/html/rfc6877
- RFC 7335, IPv4 Service Continuity Prefix: https://www.rfc-editor.org/rfc/rfc7335.html
- RFC 7050, Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis: https://www.rfc-editor.org/rfc/rfc7050
- RFC 8880, Special Use Domain Name `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc8880.html
- `clatd` upstream repository and documentation: https://github.com/toreanderson/clatd
- Debian `clatd` package page: https://packages.debian.org/trixie/net/clatd
- Ubuntu `clatd` package page: https://launchpad.net/ubuntu/%2Bsource/clatd
- Jool 464XLAT documentation: https://www.jool.mx/en/464xlat.html
- Jool node-based translation documentation: https://www.jool.mx/en/node-based-translation.html
- Jool `instance` mode documentation: https://www.jool.mx/en/usr-flags-instance.html
- Jool `eamt` mode documentation: https://www.jool.mx/en/usr-flags-eamt.html
- Android Open Source Project `clatd` source tree: https://android.googlesource.com/platform/packages/modules/Connectivity/+/refs/heads/main/clatd/

## Issues Found
- The prerequisites said `ip6tables` was required. I changed this to `iproute2` plus either `clatd` or Jool SIIT, because the documented `clatd` path does not require the post's `ip6tables` setup and the manual path depends on Jool instead.
- The source-install example for `clatd` used `make install`, which does not match the upstream quick-install flow. I changed it to `make -C clatd install installdeps` to reflect the documented install target and dependency installation.
- The `clatd` configuration snippet used incorrect keys and comments. I replaced `ipv4-addr` with `clat-v4-addr`, `v6-addr` with `clat-v6-addr`, clarified that `clat-dev` is the CLAT interface name, and added `plat-dev` as the optional uplink override because those are the current upstream names and behaviors.
- The post said RFC 7335 recommends `192.0.0.2/29` for the CLAT interface and that `ip addr show clat` should show `192.0.0.2/29`. Upstream `clatd` defaults to `clat-v4-addr=192.0.0.1`, while `192.0.0.2` is the default internal TAYGA IPv4 address. I corrected the config example and the expected interface output to `192.0.0.1/32`.
- The manual Jool section mixed Netfilter mode with `JOOL_SIIT` iptables rules and used an outdated `pool6 add` command. I removed those invalid commands and replaced them with the current Jool 4 style: `instance add --netfilter --pool6 ...` plus an `eamt add` mapping.
- The routing section added the IPv4 default route twice and implied it always had to be done manually. I changed it to reflect `clatd`'s documented default behavior and left a single manual route example for the case where `v4-defaultroute-enable=no` is set.
- The RFC 7050 example embedded `192.0.0.1` in the synthesized AAAA record. RFC 7050 and RFC 8880 define `ipv4only.arpa` using `192.0.0.170` and `192.0.0.171`, so I corrected the example to `64:ff9b::c000:00aa`.
- The packet-capture example looked for protocol 41, which is IPv6-in-IPv4 tunneling and not how CLAT works here. I changed it to capture IPv6 traffic directly.
- The application test section used stale or unreliable direct-IP HTTP targets (`93.184.216.34` and `8.8.8.8`). I replaced them with `1.1.1.1`, which was verified live on 2026-05-06 to answer HTTP/HTTPS requests, and kept the hostname-based example separate.
- The summary said CLAT makes all IPv4 applications work transparently. That was too absolute, so I narrowed it to say CLAT lets many IPv4 applications, especially ones that need an IPv4 socket API, keep working on IPv6-only access networks.

## Review Notes
- `clatd` is currently packaged in Debian and Ubuntu, but package availability can still vary across older Ubuntu releases. The source-install path remains useful as a fallback.
- Manual Jool-based CLAT setups are topology-dependent. A host-local CLAT requires the namespace and veth approach documented in Jool's node-based translation guide; a router/CPE CLAT uses the 464XLAT-style forwarding topology.
- Live endpoint checks on 2026-05-06 showed that direct-IP HTTP examples are volatile over time, so these examples may need periodic revalidation even when the protocol guidance remains correct.
