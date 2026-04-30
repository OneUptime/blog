# Validation Summary: How to Inspect the VXLAN FDB (Forwarding Database)

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- VXLAN
- Linux bridge
- `bridge` (iproute2)
- `ip link` (iproute2)

## Sources Consulted
- Linux kernel VXLAN documentation: https://docs.kernel.org/networking/vxlan.html
- Linux kernel bridge documentation: https://docs.kernel.org/next/networking/bridge.html
- `bridge(8)` manual page: https://man7.org/linux/man-pages/man8/bridge.8.html
- `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- RFC 7348 (VXLAN): https://www.rfc-editor.org/rfc/rfc7348

## Issues Found
- The post used `permanent` for forwarded static VXLAN FDB entries. Current `bridge(8)` documentation distinguishes `permanent`/`local` from `static`, so the commands and example output were updated to use `static` for statically configured forwarding entries.
- The monitoring example filtered only `permanent` entries, which would miss the distinction between dynamic and static forwarding entries. It was updated to `bridge fdb show dev vxlan0 dynamic`, which directly shows learned dynamic entries.
- The aging section used the bridge's `ageing_time`, but the post is about the VXLAN device FDB. It was corrected to use the VXLAN device's `ageing` setting via `ip link set vxlan0 type vxlan ageing 300`, as documented in `ip-link(8)`.
- The ARP suppression section used `arp_suppress`/`arp_proxy` commands that do not match current Linux bridge/VXLAN controls. It was corrected to use `bridge link ... neigh_suppress`, which is the documented bridge-port setting for ARP/ND proxying and suppression.

## Review Notes
- The Linux kernel VXLAN documentation still shows an older minimal `bridge fdb add ... dst ... dev vxlan0` example without explicitly naming the entry state. Current `bridge(8)` documentation is more precise about `static` versus `permanent`, so the post was aligned to the current CLI semantics.
