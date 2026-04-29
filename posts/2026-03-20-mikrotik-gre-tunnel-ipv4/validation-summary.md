# Validation Summary: How to Configure GRE Tunnel for IPv4 on MikroTik

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- MikroTik RouterOS (v7 syntax)
- GRE (Generic Routing Encapsulation) over IPv4
- OSPF (RouterOS v7 interface-template)
- IP firewall filter and mangle (MSS clamping)
- Static routing

## Sources Consulted
- MikroTik RouterOS documentation: GRE interface (https://help.mikrotik.com/docs/display/ROS/GRE)
- MikroTik wiki: Manual:Interface/Gre
- RFC 2784 (Generic Routing Encapsulation)
- MikroTik RouterOS v7 OSPF documentation (https://help.mikrotik.com/docs/display/ROS/OSPF)
- MikroTik IP/Firewall/Mangle documentation (change-mss action)
- Cross-reference with sibling posts: `2026-03-20-mikrotik-ospf-ipv4` and `2026-03-20-mikrotik-ipsec-vpn-ipv4`

## Issues Found
No technical issues found.

All commands, parameters, and calculations were verified:
- `/interface gre add` parameters (`name`, `remote-address`, `local-address`, `keepalive`, `comment`) are correct.
- `keepalive=10s,3` uses the valid `interval,retries` format.
- MTU calculation (1500 - 24 = 1476) correctly accounts for the 20-byte outer IPv4 header plus 4-byte GRE basic header.
- MSS calculation (1476 - 40 = 1436) correctly accounts for the 40-byte TCP/IP header.
- `/ip firewall filter` accepts `protocol=gre` (IP protocol 47).
- `/routing ospf interface-template add` with `interfaces=` (plural) and `area=` is correct RouterOS v7 syntax.
- `/ip firewall mangle` MSS clamping with `action=change-mss`, `new-mss=`, `tcp-flags=syn`, `passthrough=yes` is correct.
- `place-before=0` to insert at the top of the chain is valid (consistent with other posts in this collection).
- Verification commands (`/interface gre print`, `print stats`, `/ping ... src-address=`) are valid.

## Review Notes
- The post uses RouterOS v7 OSPF syntax (`interface-template`). The example assumes an OSPF instance and `backbone` area already exist. The companion OSPF post (`2026-03-20-mikrotik-ospf-ipv4`) covers that setup, so this is a reasonable scoping decision for a GRE-focused tutorial.
- The MSS clamping rule uses `in-interface=gre-to-routerB` only. This clamps SYN packets arriving through the tunnel. For fully bidirectional MSS clamping in production, an additional rule with `out-interface=gre-to-routerB` is also commonly used, but the example as shown is technically valid.
- The default MTU on a MikroTik GRE tunnel is already 1476, so the explicit `mtu=1476` is redundant but harmless and serves educational value.
- The firewall rule comment mentions "on WAN interface" but the rule itself does not constrain `in-interface`. This is a minor wording observation, not a technical error — accepting GRE globally is a reasonable simple example.
