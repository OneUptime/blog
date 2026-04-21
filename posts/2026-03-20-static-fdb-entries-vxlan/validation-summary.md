# Validation Summary: How to Add Static FDB Entries for VXLAN

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux VXLAN interfaces
- Linux bridge forwarding database (FDB)
- `iproute2` `ip link` and `bridge fdb` commands
- Static MAC-to-VTEP mappings
- BUM traffic handling with head-end replication
- BGP EVPN control plane concepts

## Sources Consulted
- Linux kernel VXLAN documentation: https://docs.kernel.org/networking/vxlan.html
- `bridge(8)` Linux manual page: https://man7.org/linux/man-pages/man8/bridge.8.html
- `ip-link(8)` Linux manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- RFC 7348, Virtual eXtensible Local Area Network (VXLAN): https://www.rfc-editor.org/rfc/rfc7348
- Local `iproute2` 6.1.0 `bridge fdb help` output
- Local `iproute2` 6.1.0 `ip link help vxlan` output

## Issues Found
- The BUM flood-list examples used `bridge fdb add` for multiple `00:00:00:00:00:00` entries. `bridge fdb append` is the correct operation for adding multiple forwarding entries with the same link-layer address so the VXLAN driver sends a copy to each matching entry. Updated the BUM examples, automation loop, and takeaway to use `bridge fdb append`.

## Review Notes
- The unicast static FDB examples, VXLAN `nolearning` example, `dstport 4789` usage, `bridge fdb show`, delete, and flush commands are consistent with the checked `iproute2` syntax and Linux VXLAN documentation.
- The post uses `permanent` for non-aging entries. This is accepted by `bridge fdb`; some deployments or tools may also show or use `static` for controller-installed/static bridge FDB entries.
