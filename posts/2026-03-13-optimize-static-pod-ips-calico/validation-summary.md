# Validation Summary: Optimize Static Pod IPs with Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico (CNI / IPAM)
- Calico `IPPool` and `IPReservation` custom resources
- `calicoctl` CLI
- Kubernetes (StatefulSet)
- `cni.projectcalico.org/ipAddrs` pod annotation

## Sources Consulted
- Calico IP Reservation reference: https://docs.tigera.io/calico/latest/reference/resources/ipreservation
- Calico IP Pool reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- "Use a specific IP address with a pod": https://docs.tigera.io/calico/latest/networking/ipam/use-specific-ip
- `calicoctl ipam show` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- `calicoctl ipam release` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- "What's New in Calico v3.21" (Tigera blog) — confirms `IPReservation` introduced in v3.21

## Issues Found
1. **Contradictory `natOutgoing` value in IPPool example.** The comment said "Disable NAT for this pool since IPs are tracked externally" but the YAML had `natOutgoing: true`, which actually *enables* outbound NAT/masquerading per the Calico IPPool reference. For a static IP pool whose addresses must remain visible to external systems, NAT should be off. Changed `natOutgoing: true` → `natOutgoing: false` to match the comment and the stated intent.
2. **Misleading `disabled` comment in IPPool example.** The comment "Disable auto-allocation - IPs must be explicitly requested" was inconsistent with `disabled: false` (which leaves the pool active and eligible for auto-allocation). Since Step 2 of the post relies on `IPReservation` to keep specific IPs out of automatic allocation while keeping the pool itself active, the YAML value was correct but the comment was wrong. Rewrote the comment to: "Keep pool enabled - specific IPs are reserved via IPReservation in Step 2".

The pre-existing prerequisite update (Calico v3.21+ for `IPReservation`) is accurate — Tigera's release notes confirm `IPReservation` was introduced in v3.21.

## Review Notes
- The `cni.projectcalico.org/ipAddrs: '["10.48.100.10"]'` annotation syntax is correct per Calico docs. Per-AF (one IPv4 / one IPv6) and the pod must be (re)created for the annotation to take effect — these caveats are not covered in the post but are mentioned indirectly via "update per replica via an init container or external webhook".
- All three `calicoctl ipam` commands (`show --show-blocks`, `show --ip=...`, `release --ip=...`) match the official CLI reference.
- The `IPReservation` `reservedCIDRs` list correctly accepts `/32` single-IP entries.
- Using a single static IP for a 3-replica StatefulSet template would collide in practice; the author acknowledges this with the "update per replica via an init container or external webhook" comment, so the example is illustrative rather than directly applicable. No change made — author's intent is explicit.
