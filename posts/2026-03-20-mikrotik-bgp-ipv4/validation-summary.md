# Validation Summary: How to Configure BGP for IPv4 on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MikroTik RouterOS v6 BGP (`/routing bgp instance`, `/routing bgp peer`, `/routing bgp network`)
- MikroTik RouterOS v7 BGP (`/routing bgp template`, `/routing bgp connection`, `/routing bgp session`)
- BGP (Border Gateway Protocol) — eBGP and iBGP
- RouterOS routing filters (`/routing filter rule`) with v7 if/then rule syntax
- IP firewall address-lists used for prefix advertisement in v7

## Sources Consulted
- MikroTik RouterOS BGP documentation: https://help.mikrotik.com/docs/spaces/ROS/pages/328220/BGP
- MikroTik v6 to v7 migration guide: https://help.mikrotik.com/docs/spaces/ROS/pages/30474256/Moving+from+ROSv6+to+v7+with+examples
- MikroTik Routing — Route Selection and Filters: https://help.mikrotik.com/docs/spaces/ROS/pages/74678285/Route+Selection+and+Filters
- MikroTik /routing/bgp reference: https://help.mikrotik.com/docs/spaces/ROS/pages/331612228/routing+bgp

## Issues Found

1. **Incorrect parameter name `templates=default` (plural)** in both the eBGP and iBGP `/routing bgp connection add` examples. The official RouterOS v7 parameter is `template` (singular). Fixed by replacing `templates=default` with `template=default` in both code blocks. Verified directly against MikroTik's official v6→v7 migration documentation, which uses the singular form (e.g., `set default template=myAsTemplate`).

2. **`/routing bgp network add` shown without version qualification** — this command is RouterOS v6 only and does not exist in v7. The v7 example created the address-list but never wired it up to the connection, so it would not actually advertise anything. Fixed by labeling the v6 command explicitly and adding the missing v7 line `/routing bgp connection set ISP-PEER output.network=BGP-PREFIXES` to complete the v7 flow.

3. **Misleading verify-section comments.** `/routing bgp advertisements print` was labeled "Show received BGP routes," but per MikroTik docs this command shows OUTBOUND advertised routes ("contains read-only information about outgoing routing information currently advertised"), not received ones. Also `/routing bgp session print detail` was labeled "Check advertised prefixes," but this command shows session details (state, capabilities, timers, message counts), not advertised prefixes. Fixed both comments to accurately describe what each command outputs and added a (v7) tag to the session commands since they don't exist in v6.

## Review Notes
- `connect=yes listen=yes` on an internet-facing eBGP peer is syntactically valid but unusual — MikroTik's docs note that `listen=yes` should not be enabled in unsafe environments. The post's example would benefit from a security caveat, but this is a stylistic improvement rather than a technical error.
- `ttl=1` in the v6 example is correct for directly-connected eBGP. Readers configuring multihop eBGP would need `multihop=yes` and a higher TTL; this caveat is not mentioned but the shown configuration is correct for the common adjacent-peer case.
- `local.role=ebgp` and `local.role=ibgp` are both valid v7 values. Other roles (e.g., `ibgp-rr-client`) exist for route-reflector setups; the post mentions route reflectors only at a conceptual level in the conclusion, which is fine for an introductory guide.
- `/ip route print where bgp` works in v7 as a backward-compatible alias; the canonical v7 path is `/routing route print where bgp`.
