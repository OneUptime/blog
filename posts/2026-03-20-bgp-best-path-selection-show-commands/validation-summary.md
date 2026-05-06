# Validation Summary: How to Verify BGP Best Path Selection Using show Commands

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- BGP
- FRRouting (FRR) / `vtysh`
- Cisco IOS / IOS XE
- BGP path attributes (`WEIGHT`, `LOCAL_PREF`, `AS_PATH`, `MED`, `ORIGIN`)
- RFC 4271 best-path behavior

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting 10.4 BGP route selection documentation: https://docs.frrouting.org/en/stable-10.4/bgp.html
- Cisco "Select BGP Best-path Algorithm": https://www.cisco.com/c/en/us/support/docs/ip/border-gateway-protocol-bgp/13753-25.html
- Cisco IOS IP Routing: BGP Command Reference (`show ip bgp` / `show ip bgp neighbors`): https://www.cisco.com/c/en/us/td/docs/ios-xml/ios/iproute_bgp/command/irg-cr-book/bgp-s1.html
- RFC 4271, "A Border Gateway Protocol 4 (BGP-4)": https://www.ietf.org/rfc/rfc4271

## Issues Found
- The FRR examples used `show ip bgp`, which FRR documents as the older Quagga-style command format. I updated the examples to the current `show bgp ipv4 unicast ...` form.
- The FRR command `show ip bgp 192.0.2.0/24 bestpath` is not a documented command. I replaced it with documented FRR commands: per-prefix detail via `show bgp ipv4 unicast 192.0.2.0/24` and configured-criteria display via `show bgp bestpath`.
- The FRR example `vtysh -c "show ip bgp | grep ^>"` was incorrect. Best-path lines are marked with `*>`, and piping inside the quoted `vtysh` command was not the right shell usage for this example. I changed it to `vtysh -c "show bgp ipv4 unicast" | grep '^[[:space:]]*\*>'`.
- The Cisco command `show ip bgp 192.0.2.0/24 bestpath-as-path-multipath-relax` was invalid. `bgp bestpath as-path multipath-relax` is a configuration command, not a show command. I replaced it with documented `show ip bgp ... bestpath` and `show ip bgp ... best-path-reason`.
- The best-path algorithm section stated that Weight is Cisco-only. FRR also implements a Weight check, so I corrected that statement and clarified that the list is a common implementation order rather than a universal standard sequence.
- The original wording implied that the BGP best path is always installed in the IP routing table. I corrected that to say BGP prefers a path and attempts to install it, which is more accurate in cases such as RIB failure.
- The MED description was simplified too aggressively. I clarified that MED is, by default, compared only among paths from the same neighboring AS, per RFC/Cisco/FRR behavior.

## Review Notes
- `show ip bgp ... best-path-reason` is an IOS XE feature documented as added in IOS XE Gibraltar 16.10.1; older classic IOS releases may not support it.
- FRR detailed per-prefix output marks the best path and can include tie-break annotations such as `First path received`; exact late tie-breakers vary between implementations.
