# Validation Summary: How to Create a macvlan Network for Docker Containers with IPv4

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Docker (network create, run, inspect, exec)
- Docker macvlan network driver
- Docker Compose (v3.8 schema, ipam config)
- Linux networking (VLAN subinterfaces, MAC addresses, /sys/class/net)
- IPv4 / CIDR addressing

## Sources Consulted
- Docker `network create` reference: https://docs.docker.com/reference/cli/docker/network/create/
- Docker macvlan driver guide: https://docs.docker.com/engine/network/drivers/macvlan/
- Docker Compose networking spec (ipam config, ip_range): https://docs.docker.com/reference/compose-file/networks/
- Linux kernel macvlan driver documentation
- RFC 950 / 1878 (subnet alignment for CIDR blocks)

## Issues Found
- **Invalid CIDR alignment for `--ip-range`**: The post used `192.168.1.200/28`, which is not a properly-aligned CIDR — a /28 prefix requires the network address to be aligned to a multiple of 16 in the last octet (so .192/28 or .208/28 are valid; .200/28 is not). Modern Docker / IPAM may reject or normalize this in unexpected ways. Additionally, the inline comments described the resulting range as "192.168.1.200-220" (21 addresses) and "192.168.1.200-215" (16 addresses but starting at a non-aligned boundary), neither of which actually corresponds to a /28 block.
  - Fix: Changed `--ip-range 192.168.1.200/28` to `--ip-range 192.168.1.208/28` (a properly-aligned /28 covering 192.168.1.208–192.168.1.223). Updated both comments to describe the correct range. Applied the same change to the `ip_range` field in the Docker Compose example. The static IP examples (`192.168.1.210`) remain unchanged and now correctly fall within the auto-allocation range.

## Review Notes
- The `version: "3.8"` field in the Compose example is now considered obsolete/deprecated by current Docker Compose (the `version` top-level field is no longer required and emits a warning), but it remains functionally accepted and is not technically wrong. Left as-is to preserve author style.
- The post does not mention the well-known macvlan limitation that the Docker host itself cannot communicate with macvlan-attached containers by default (a kernel-level isolation, not a Docker bug). Workaround typically involves creating an additional macvlan shim on the host. Not an error — just an omission worth noting for readers.
- The "promiscuous mode" prerequisite is slightly oversimplified. The kernel macvlan driver itself does not strictly require the parent NIC to be in promiscuous mode in all cases (it manages multiple unicast MAC filters when the NIC supports it), but many real-world NICs and switch ports do require it for reliable operation. The post's framing is reasonable for a practical guide.
- VLAN subinterface example (`eth0.20`) correctly assumes the subinterface already exists on the host; readers may need to create it via `ip link add link eth0 name eth0.20 type vlan id 20` first. Not strictly an error — just a prerequisite implicit in the example.
