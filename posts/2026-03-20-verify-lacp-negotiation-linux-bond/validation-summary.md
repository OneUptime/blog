# Validation Summary: How to Verify LACP Negotiation on a Linux Bond

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux kernel bonding driver (mode 4 / 802.3ad)
- LACP (Link Aggregation Control Protocol, IEEE 802.3ad / 802.1AX)
- `/proc/net/bonding` procfs interface
- tcpdump (Ethernet slow-protocols capture)
- Standard Linux CLI: `cat`, `grep`, `watch`

## Sources Consulted
- Linux kernel bonding documentation: https://www.kernel.org/doc/Documentation/networking/bonding.txt
- Linux kernel source `drivers/net/bonding/bond_3ad.c` and `bond_main.c` (proc output format, churn states, aggregator fields)
- IEEE 802.1AX / 802.3ad specification for Link Aggregation
- IANA EtherType assignments: Slow Protocols = 0x8809
- tcpdump(1) man page and pcap-filter(7) syntax for `ether proto`

## Issues Found
No technical issues found.

Verified items:
- Mode 4 == 802.3ad: correct.
- `/proc/net/bonding/bond0` is the authoritative path and the sample output matches the kernel driver's format (Active Aggregator Info block, per-slave Aggregator ID, LACP PDUs rx/tx, Actor/Partner Churn State).
- Churn state value "monitoring" is one of the valid states emitted by the bonding driver (alongside "none" and "churned").
- Transmit Hash Policy `layer3+4 (3)` matches the numeric policy value used by the driver.
- EtherType `0x8809` is the IEEE Slow Protocols EtherType that carries LACPDUs; `tcpdump -i eth0 ether proto 0x8809` is correct BPF syntax.
- Key indicators (matching Aggregator IDs across slaves, non-zero increasing PDU counts, Number of ports matching slave count) are the standard correct checks.

## Review Notes
- The second tcpdump command (`tcpdump -i eth0 ether proto 0x8809 -e -v`) is introduced as "Filter specifically for LACP" but uses the same filter as the first; it simply adds `-e` (link-layer headers) and `-v` (verbose). The filter itself captures all Slow Protocols subtypes (LACP, Marker), which in practice is almost always LACP in a bonding deployment. Not incorrect, just slightly loose wording.
- The sample `/proc/net/bonding/bond0` output abbreviates the `eth1` slave block (omits Speed/Duplex/Permanent HW addr/Churn fields). Real output lists those fields for every slave. This is acceptable for brevity in a tutorial.
- Bonding driver version shown (`v3.7.1`) has been stable across many modern kernels; no deprecation concerns.
