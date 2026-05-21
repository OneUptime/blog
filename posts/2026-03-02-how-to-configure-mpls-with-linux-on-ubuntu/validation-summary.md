# Validation Summary: How to Configure MPLS with Linux on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Linux kernel MPLS forwarding
- iproute2
- FRRouting
- OSPF
- LDP
- SR-MPLS

## Sources Consulted
- FRRouting LDP documentation: https://docs.frrouting.org/en/stable-10.2/ldpd.html
- FRRouting OSPF Segment Routing documentation: https://docs.frrouting.net/en/stable-8.1/ospfd.html#segment-routing
- FRRouting Debian repository instructions: https://deb.frrouting.org/
- FRRouting current daemons file: https://github.com/FRRouting/frr/blob/stable/10.4/tools/etc/frr/daemons
- FRRouting installation / Linux MPLS notes: https://github.com/FRRouting/frr/blob/stable/10.4/doc/user/installation.rst
- Linux kernel MPLS sysctl documentation: https://www.kernel.org/doc/html/next/networking/mpls-sysctl.html
- iproute2 ip-route manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- RFC 3032 MPLS Label Stack Encoding: https://www.rfc-editor.org/rfc/rfc3032

## Issues Found
- The post said Linux kernel MPLS support started in 4.3. FRRouting's Linux notes state basic MPLS support started in 4.1, with additional capability in 4.3 and 4.5, so the version claim was corrected.
- The post described labels as 32-bit values. RFC 3032 defines a 32-bit label stack entry containing a 20-bit label value, so the wording was corrected.
- The `net.mpls.platform_labels` comment described label stack depth. Linux documents this as the number of platform label table entries, so the comment was corrected.
- The `/etc/frr/daemons` snippet included `zebra=yes` and `mpls_enabled=yes`, which are not present in the current FRR daemons file. The snippet now enables only `ospfd` and `ldpd`, with zebra handled by FRR startup.
- The topology diagram omitted Router B and Router C interface addresses. It was clarified to match the later configurations.
- The LDP examples used `transport-address`; FRR documents `discovery transport-address`, so the LDP configuration snippets were updated.
- The sample MPLS forwarding table entry and static label-swap command did not include the outgoing label action while describing a swap to label 200. The examples now use `as 200`.
- The interface status check used `ip link show ... | grep MPLS`, which does not verify Linux MPLS input. It now checks `net.mpls.conf.<interface>.input`.
- The ping example used `-I lo`; for this topology, sourcing from Router A's loopback address is clearer and technically correct, so it now uses `-I 10.0.0.1`.
- The SR-MPLS OSPF example omitted Opaque LSA and Router Information configuration and used a non-documented verification command. It now includes `capability opaque`, `router-info area`, and the documented `show ip ospf database segment-routing self-originate`.
- The LDP troubleshooting commands used `debug mpls ldp events`, `debug mpls ldp messages recv`, `debug mpls ldp messages sent`, and `show mpls ldp interface`. Current FRR documents `debug mpls ldp event`, `debug mpls ldp messages`, and `show mpls ldp ipv4 interface`, so these were corrected.

## Review Notes
The guide is technically relevant and suitable as a lab-oriented MPLS/FRR tutorial after the corrections. Future improvements could add Ubuntu version caveats and note that SR-MPLS support in FRR is documented as experimental for OSPF MPLS dataplane in the referenced FRR documentation.
