# Validation Summary: How to Understand BGP Path Selection for IPv4 Prefixes

## Status
validated

## Post Type
Guide

## Technologies Covered
- BGP-4
- FRRouting (FRR)
- IPv4 unicast routing
- Linux `iproute2`

## Sources Consulted
- FRRouting BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRRouting route-map documentation: https://docs.frrouting.org/en/latest/routemap.html
- RFC 4271, Border Gateway Protocol 4 (BGP-4): https://www.rfc-editor.org/rfc/rfc4271
- RFC 4451, BGP MULTI_EXIT_DISC (MED) Considerations: https://www.rfc-editor.org/rfc/rfc4451
- Local `ip route help` output from `iproute2`

## Issues Found
- The original best-path list did not match FRR's documented route-selection order. It used a Cisco-flavored sequence and omitted FRR-specific steps such as administrative distance, multipath equality, already-selected eBGP preference, cluster-list length, and the final peer-address tie-break. I replaced the list with FRR's documented order.
- The post described MED too broadly. In FRR and RFC 4271, MED is compared for routes from the same neighboring AS unless comparison behavior is changed by configuration. I corrected the explanation and adjusted the MED example to clearly represent multiple links to the same neighboring AS.
- The post used FRR's old `show ip bgp` command structure and an undocumented per-prefix `show ip bgp ... bestpath` command. I replaced those with current documented commands: `show bgp ipv4 unicast 10.10.0.0/24` and `show bgp summary`.
- The route-map attachment examples were shown directly under `router bgp`. I moved them under `address-family ipv4 unicast` to match FRR's documented configuration style for IPv4 unicast policy application.
- The verification text referred to the Linux kernel "RIB". I corrected that to "kernel routing table" to match standard Linux routing terminology.

## Review Notes
- FRR was not installed in this workspace, so `vtysh` commands could not be executed locally during review. Command validation was done against FRR's official documentation.
- FRR documents that the old `show ip bgp` command structure may be removed in the future, so using `show bgp ...` is the safer current form.
- Advanced FRR options such as `bgp always-compare-med`, `bgp bestpath aigp`, and multipath knobs can change best-path behavior. The post now reflects the default documented decision process.
