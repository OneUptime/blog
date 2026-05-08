# Validation Summary: Validating Cilium BGP Route Advertisement

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- Cilium CLI and cilium-dbg
- Cilium LoadBalancer IPAM
- Kubernetes Services and kubectl
- BGP
- FRRouting (FRR)

## Sources Consulted
- Cilium BGP Control Plane overview: https://docs.cilium.io/en/latest/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane operation guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium BGP Control Plane resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium CLI `cilium bgp peers` reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_peers.html
- Cilium CLI `cilium bgp routes` reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_routes/
- Cilium debug CLI `cilium-dbg bgp routes` reference: https://docs.cilium.io/en/latest/cmdref/cilium-dbg_bgp_routes.html
- Cilium LoadBalancer IPAM documentation: https://docs.cilium.io/en/latest/network/lb-ipam/
- FRR BGP documentation: https://docs.frrouting.org/en/latest/bgp.html
- FRR Zebra route display documentation: https://docs.frrouting.org/en/latest/zebra.html

## Issues Found

1. **Invalid Cilium CLI flag**: The post used `cilium bgp peers --verbose`, but the current documented flags for `cilium bgp peers` do not include `--verbose`. The standard `cilium bgp peers` output already includes session uptime and received/advertised route counts. Replaced the invalid command with `cilium bgp peers`.

2. **Incorrect description of available routes**: The post described `cilium bgp routes available ipv4 unicast` as routes received from BGP peers and suggested comparing them to Linux kernel routes. Cilium documents this command as showing Cilium's local BGP routing table, and the Cilium BGP Control Plane does not program the datapath. Updated the description and replaced the kernel route comparison with an equivalent `cilium-dbg bgp routes available ipv4 unicast` command for agent-level debugging.

3. **Incorrect LB IPAM resource and status example**: The post used `kubectl get ciliumulbippool -o yaml` and showed an `allocatedIPs` status field. Cilium documents the resource kind as `CiliumLoadBalancerIPPool` and commonly uses the `ippools` short name; pool status exposes condition entries such as `cilium.io/IPsTotal`, `cilium.io/IPsAvailable`, and `cilium.io/IPsUsed`. Updated the command to `kubectl get ippools -o yaml` and corrected the sample status shape.

## Review Notes
- The `cilium bgp routes advertised ipv4 unicast` and `cilium bgp routes available ipv4 unicast` command forms match the current Cilium CLI command reference.
- The Cilium BGP Control Plane can advertise Service VIPs as exact `/32` or `/128` routes, matching the LoadBalancer IP validation examples.
- The post is version-neutral. The validation used current Cilium stable/latest docs available on 2026-05-08; users on older Cilium versions should confirm their installed CLI supports the same BGP subcommands.
- The local environment did not have `cilium`, `kubectl`, or `vtysh` installed, so command validation was performed against official documentation rather than local `--help` output.
