# Validation Summary: Diagnosing Route Advertisement Problems in Calico BGP

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico Open Source BGP networking
- Kubernetes
- BIRD routing daemon
- BGP
- Linux routing and firewall diagnostics
- BusyBox and netshoot troubleshooting containers

## Sources Consulted
- Calico documentation: `calicoctl node status` command: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico documentation: BGPConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico documentation: BGPPeer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: BGPFilter resource: https://docs.tigera.io/calico/latest/reference/resources/bgpfilter
- Calico documentation: IPPool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: VXLAN and IP-in-IP overlay networking: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip
- Kubernetes documentation: `kubectl debug`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- IETF RFC 4271, Border Gateway Protocol 4: https://datatracker.ietf.org/doc/rfc4271/
- Local BusyBox `wget --help` output for supported timeout option syntax

## Issues Found
- The post described `calicoctl node status` as showing BGP sessions across all nodes. Official Calico documentation describes it as checking the local Calico node instance, including its BGP peering states. Updated the wording to say it verifies the affected node and shows sessions for the Calico node where it is run.
- The post implied IPPool BGP advertisement could be verified from `natOutgoing`, `ipipMode`, and `vxlanMode`. Current Calico IPPool resources use `disableBGPExport` to disable exporting the pool CIDR over BGP. Updated the command and diagram to check `disableBGPExport` and set it to `false`.
- The BGPConfiguration comments implied the cluster-wide AS number must always be consistent and that node-to-node mesh is disabled only for route reflectors. Calico supports per-node and per-peer AS configuration, and node-to-node mesh can be replaced by explicit BGPPeer layouts. Updated those comments.
- The pod connectivity verification could schedule both test pods on the same node, which would not validate cross-node routing. Updated the example to schedule the client pod onto a node different from the server node and fail clearly if only one node is available.
- The BusyBox `wget` example used `--timeout=5`, which is not supported by the BusyBox help output available in this environment. Updated it to use `-T 5`.
- Added a namespace note for `calico-node` pod commands because operator installs commonly use `calico-system`, while manifest installs commonly use `kube-system`.

## Review Notes
The post is technically relevant and current for Calico deployments using the BIRD BGP backend. VXLAN-only Calico deployments do not require BGP for internal cluster routing, so the guide correctly applies to clusters intentionally configured for BGP routing or external BGP advertisement rather than to every Calico installation.
