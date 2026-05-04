# Validation Summary: How to Configure SRv6 Traffic Engineering

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- SRv6 (Segment Routing over IPv6) data plane
- SRv6 Traffic Engineering (SR-TE) policies
- Linux iproute2 `ip -6 route ... encap seg6` (SRv6 encapsulation)
- Linux policy routing (`ip -6 rule`)
- Cisco IOS-XR `segment-routing traffic-eng` configuration
- BGP SR Policy distribution (SAFI 73)
- BGP Color Extended Community for automated steering
- ECMP / weighted candidate paths
- `traceroute6` and IOS-XR `show segment-routing` operational commands

## Sources Consulted
- RFC 9256 — Segment Routing Policy Architecture (https://www.rfc-editor.org/rfc/rfc9256)
- RFC 9830 — Advertising Segment Routing Policies in BGP, SAFI 73 (https://www.rfc-editor.org/rfc/rfc9830)
- RFC 9012 — BGP Tunnel Encapsulation Attribute / Color Extended Community (https://www.rfc-editor.org/rfc/rfc9012)
- RFC 8754 — IPv6 Segment Routing Header (SRH), §2 wire format (https://www.rfc-editor.org/rfc/rfc8754)
- IANA SAFI registry (entry 73 = "SR Policy SAFI") (https://www.iana.org/assignments/safi-namespace/safi-namespace.xhtml)
- Cisco ASR 9000 Segment Routing Configuration Guide — `Configure SR-TE Policies` (https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/710x/segment-routing/configuration/guide/b-segment-routing-cg-asr9000-710x/configure-sr-te-policies.html)
- Cisco ASR 9000 Routing Configuration Guide — Implementing Routing Policy / `extcommunity-set opaque` and `set extcommunity color` (https://www.cisco.com/c/en/us/td/docs/routers/asr9000/software/24xx/routing/configuration/guide/b-routing-cg-asr9000-24xx/implementing-routing-policy.html)
- Cisco 8000 BGP Config Guide — BGP Next-Hop Processing / `nexthop resolution prefix-length minimum` (https://www.cisco.com/c/en/us/td/docs/iosxr/cisco8000/bgp/b-bgp-config-cisco8000/m-bgp-next-hop-processing.html)
- `ip-route(8)` Linux manpage — seg6 encap modes and `segs` argument semantics (https://man7.org/linux/man-pages/man8/ip-route.8.html)
- segment-routing.org reference: ConfigureEncapsulation (https://segment-routing.org/index.php/Implementation/ConfigureEncapsulation)

## Issues Found

1. **Wrong RFC attribution for BGP SR-Policy distribution.** The post titled Step 2 "BGP SR-Policy (RFC 9256)". RFC 9256 is the SR Policy *architecture*; the BGP SAFI 73 distribution mechanism is specified in RFC 9830. Updated the heading and added a one-line note clarifying both RFCs and their roles.

2. **Wrong BGP address-family used to receive SR Policy NLRI from the controller.** The original config used `address-family link-state link-state`, which is BGP-LS (BGP Link State, RFC 9552/7752) — used to *export topology*, not to receive SR Policy candidate paths. Replaced with `address-family ipv6 sr-policy` (the IOS-XR address-family for SR Policy SAFI 73), at both the global BGP level and inside the neighbor block, matching the SRv6 (IPv6 endpoint) focus of the post.

3. **Invalid IOS-XR `set extcommunity color` syntax.** The original used an inline integer (`set extcommunity color 100`), which IOS-XR does not accept. The Color Extended Community is encoded as an opaque transitive ext-community (RFC 9012), so IOS-XR requires defining a named `extcommunity-set opaque NAME` containing the color value and then referencing NAME in `set extcommunity color`. Added the `extcommunity-set opaque COLOR-100` block and updated the route-policy to reference `COLOR-100`.

4. **Wrong `nexthop resolution prefix-length minimum` value for IPv6.** Under `address-family vpnv6 unicast`, the value `32` doesn't correspond to a host-route filter — IPv6 host routes are /128. Changed to `128` so it actually filters resolution to /128 endpoint host routes (the typical loopback/SR-policy-endpoint case).

5. **Non-canonical `dynamic` candidate-path metric syntax.** The original showed `metric type igp` on a single line. The IOS-XR running-config (and canonical configuration form) renders this as a nested submode: `metric` then `type igp` indented underneath, with `!` exit markers. Reformatted to the nested form so the snippet matches actual `show running-config` output.

## Review Notes
- The `route-policy SET-COLOR-100 out` placement directly under `address-family vpnv6 unicast` rather than under a specific `neighbor X.X.X.X` block is structurally a simplification — in production IOS-XR, outbound route-policies are applied per-neighbor. Left as-is because the post is clearly conceptual and restructuring it would go beyond minimal correction; readers wiring this up will naturally place it under their iBGP/eBGP neighbor block.
- The example SRv6 SIDs (`5f00:1:2:0:e001::`, etc.) sit inside the `5f00::/16` SRv6 SID block proposed for documentation/operator use; they're appropriate for a tutorial.
- The `ip -6 route ... encap seg6 mode encap segs ...` syntax is correct (per `ip-route(8)`), and `segs` is in visit order (first hop first). The kernel reverses the list when populating the SRH `Segment List[]` per RFC 8754 §2, but that detail isn't user-visible and doesn't need to be in the post.
- Requires the Linux kernel built with `CONFIG_IPV6_SEG6_LWTUNNEL=y` and `net.ipv6.conf.all.seg6_enabled=1` — not a defect, but worth noting if a future revision wants a "prerequisites" section.
