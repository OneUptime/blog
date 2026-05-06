# Validation Summary: How to Configure Balance-XOR Bonding (Mode 2) on Linux

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux bonding driver
- `iproute2` / `ip link`
- Netplan
- Ethernet link aggregation

## Sources Consulted
- Linux kernel bonding documentation: https://docs.kernel.org/6.17/networking/bonding.html
- Netplan YAML reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Local `iproute2` bond help via `ip link help bond`

## Issues Found
- The post described the mode 2 hash as a generic `src_MAC XOR dst_MAC` formula. I corrected this to the documented default `layer2` behavior, which uses the last byte of the source MAC, the last byte of the destination MAC, and the packet type / EtherType before taking modulo slave count.
- The post stated that the same hash always keeps a flow on one slave and prevents out-of-order delivery. I corrected this to reflect the documented behavior: ordering is improved compared with per-packet round-robin, but `layer3+4` omits ports for fragmented TCP/UDP and other traffic, so reordering is still possible in that case.
- The comparison table labeled mode 2 and mode 4 load distribution as strictly per-flow and their ordering behavior as simply `No` for out-of-order packets. I updated the table to make both entries hash-policy-dependent and to note the fragmented `layer3+4` caveat.
- The Netplan snippet was not a valid standalone Netplan file and omitted the persistent default route shown earlier in the CLI example. I added the required top-level `network` structure, declared the member Ethernet interfaces, and added the default route using current Netplan syntax.
- The hash policy section looked exhaustive even though current bonding supports additional policies such as `encap2+3`, `encap3+4`, and `vlan+srcmac`. I clarified that the listed commands are common policies.

## Review Notes
- `balance-xor` still requires switch-side static aggregation / etherchannel-style grouping even though it does not require LACP.
- Current bonding and `iproute2` also support `encap2+3`, `encap3+4`, and `vlan+srcmac` transmit hash policies; the post now presents the listed values as common options rather than a complete list.
