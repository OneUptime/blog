# Validation Summary: How to Create an IPvlan Network with Podman

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Podman
- IPvlan networking
- Macvlan networking
- Linux container networking
- VLAN sub-interfaces

## Sources Consulted
- Podman official documentation: `podman-network-create` https://docs.podman.io/en/latest/markdown/podman-network-create.1.html
- Linux kernel documentation: IPVLAN Driver HOWTO https://www.kernel.org/doc/html/v5.12/networking/ipvlan.html
- Docker official documentation: IPvlan network driver https://docs.docker.com/engine/network/drivers/ipvlan/

## Issues Found
- The L2 `--ip-range` example used `192.168.1.210/29`, which is not the canonical CIDR subnet boundary for a `/29` range. Changed it to `192.168.1.208/29`.
- The network was created with `sudo podman network create` but inspected with non-root `podman network inspect`. Since rootful and rootless Podman network state is separate, changed the inspect command to `sudo podman network inspect`.
- The multiple-container example reused `192.168.1.211`, which was already assigned to `web-ipvlan` earlier in the tutorial. Changed the example containers to use `192.168.1.212` and `192.168.1.213`.
- The IPvlan L3 explanation implied routing works automatically. Updated the wording to clarify that upstream networks need routes back to routed container subnets.
- The wireless support claim was too absolute. Updated it to say IPvlan can work on wireless where macvlan is often restricted.

## Review Notes
Podman was not installed in the local environment, so CLI validation was performed against the current official Podman documentation rather than local `podman --help` output.
