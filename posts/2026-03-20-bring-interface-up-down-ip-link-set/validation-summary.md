# Validation Summary: How to Bring a Network Interface Up or Down with ip link set

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- `iproute2`
- `ip link`
- Network interfaces
- MTU configuration
- MAC address configuration

## Sources Consulted
- `ip-link(8)` upstream-derived manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux kernel networking documentation on interface operational states: https://docs.kernel.org/networking/operstates.html
- Local command help in the review environment: `ip link help`, `man ip-link`

## Issues Found
- The introduction described `ip link set ... up` as activating the interface for traffic and `down` as disabling it completely. I changed this to distinguish administrative state from operational state and carrier state, which is how Linux documents interface state.
- The verification snippets expected `state UP` immediately after `ip link set ... up`. I changed them to inspect `ip link show` output for the administrative `UP` flag because the operational `state` field can vary based on carrier and interface type.
- The interface-bounce section claimed it would re-trigger DHCP, re-send IGMP reports, and reset link negotiation. I replaced that with a conditional explanation because those behaviors depend on the driver and the network-management software running on the system.
- The MAC address section said the interface must be down before changing the MAC address. I changed this to note that some drivers require that sequence, which keeps the example safe without making it a universal rule.
- The `ip link show up` example was relabeled to say it shows administratively `UP` interfaces, which matches the documented behavior.
- The conclusion was tightened to say `ip link set ... up|down` controls administrative interface state rather than universally guaranteeing traffic availability.

## Review Notes
- In Linux, `ip link set dev <iface> up` changes the administrative state. The operational `state` shown by `ip link show` may still be `DOWN`, `LOWERLAYERDOWN`, `DORMANT`, `UNKNOWN`, or `UP` depending on carrier and interface type.
