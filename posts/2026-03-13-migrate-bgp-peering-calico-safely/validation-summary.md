# Validation Summary: How to Migrate to BGP Peering in Calico Safely

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source networking
- Kubernetes
- BGP peering
- VXLAN and IP-in-IP encapsulation
- `calicoctl`
- `kubectl`
- YAML manifests

## Sources Consulted
- Calico BGP peering guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico overlay networking guide: https://docs.tigera.io/calico/latest/networking/configuring/vxlan-ipip/
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico Installation API reference: https://docs.tigera.io/calico/latest/reference/installation/api
- Calico CalicoNodeStatus resource reference: https://docs.tigera.io/calico/latest/reference/resources/caliconodestatus
- Calico `calicoctl patch` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- Calico `calicoctl apply` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico `calicoctl node status` reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calico/node` configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node

## Issues Found
- The post said to enable BGP only by patching the default `BGPConfiguration`. That is incomplete for operator-managed VXLAN-only installs where BGP may be disabled in the `Installation` resource. I added an operator patch that sets `spec.calicoNetwork.bgp` to `Enabled` before BGPConfiguration changes.
- The `calicoctl patch` examples used `--type merge`. The current Calico `calicoctl patch` reference documents the default strategic merge patch and examples generally use `-p`/`--patch` without `--type merge`; it also documents merge patch as not implemented. I removed `--type merge` from the `calicoctl` patch commands.
- The BGP verification section ran `calicoctl node status` like a workstation command. Calico documents that this command communicates with the local Calico agent and must be run on the node being checked. I replaced it with a `CalicoNodeStatus` resource example and kept `sudo calicoctl node status` as a node-local alternative.
- The BGP verification loop used `birdcl show protocols` inside `calico-node`, which is not the documented readiness interface. I changed it to call `/bin/calico-node -bird-ready`, matching the documented BIRD readiness endpoint.
- The CrossSubnet IPPool example only showed an IP-in-IP transition and would incorrectly switch a VXLAN pool to IP-in-IP. I split the example into IP-in-IP and VXLAN variants so the user keeps the same encapsulation technology while moving to `CrossSubnet`.

## Review Notes
- The BGPPeer, BGPConfiguration, IPPool field names, AS number usage, and `calicoctl apply -f` command shape are consistent with current Calico Open Source documentation.
- The example `CalicoNodeStatus` resource uses `node-1` as a placeholder and should be replaced with a real Kubernetes node name before applying it.
- `kubectl` is installed locally, but no Kubernetes cluster is configured for live command execution. `calicoctl` is not installed in this workspace, so CLI checks were verified against current official Calico documentation instead of local `--help` output.
