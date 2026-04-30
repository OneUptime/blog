# Validation Summary: How to Assign an IPv4 Address to a VXLAN Interface

## Status
validated

## Post Type
Guide

## Technologies Covered
- Linux networking
- VXLAN
- IPv4
- iproute2

## Sources Consulted
- Linux `ip-link(8)` manual page: https://man7.org/linux/man-pages/man8/ip-link.8.html
- Linux kernel VXLAN documentation: https://docs.kernel.org/6.2/networking/vxlan.html
- RFC 7348: Virtual eXtensible Local Area Network (VXLAN): https://www.rfc-editor.org/rfc/rfc7348
- Local `ip link help vxlan` output from the installed `iproute2` toolchain

## Issues Found
- The description and introduction treated the IPv4 address assigned to `vxlan0` as though it were the VXLAN tunnel endpoint. RFC 7348 defines the VTEP IP as the outer underlay IP, so I corrected the wording to describe the assigned address as the host's overlay IP on the VXLAN interface.
- The "Multiple VXLANs with Different IPs" example created VXLAN interfaces with `local` only. Per `ip-link(8)`, `remote` or `group` defines where packets for unknown destinations are sent. I added `remote 10.0.0.2` so the example matches the earlier two-host unicast topology and is usable for overlay communication.

## Review Notes
- Explicitly setting `dstport 4789` is correct and preferable because Linux historically used a pre-IANA VXLAN default port for backward compatibility.
- A future revision could mention VXLAN header overhead and MTU sizing, since reduced effective MTU is a common operational consideration even though the commands here are otherwise correct.
