# Validation Summary: Rolling Back Safely After Using calicoctl node status

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- BGP
- Calico BGPConfiguration, BGPPeer, Node, and IPPool resources

## Sources Consulted
- Calico `calicoctl node status` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico `calicoctl get` command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico BGP configuration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico IPPool resource reference: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico BGP peering configuration guide: https://docs.tigera.io/calico/latest/networking/configuring/bgp

## Issues Found
- The introduction referred broadly to "network policy" as a cause of BGP session drops. I changed this to "host endpoint/global network policy" because normal Kubernetes pod network policies do not directly govern node-level BGP sessions, while Calico host endpoint/global policy can affect host traffic.
- The node rollback example used `$(hostname)` and `hostname -I | awk '{print $1}'` with a hard-coded `/24`. I changed it to patch a named Calico Node with the original `<node-ip>/<prefix>`, matching Calico's documented Node BGP fields and avoiding an unsafe guessed prefix.
- The emergency script used `calicoctl get ... -o jsonpath`, but the official `calicoctl get` output formats include `go-template`, not `jsonpath`. I changed the peer-name extraction to use `-o go-template`.
- The emergency script assumed `calico-node` always runs in `calico-system`. I added a fallback to `kube-system`, since Calico deployments can use either namespace depending on installation method.
- The verification command implied that every topology should have `node count - 1` peers. I clarified that this check applies to node-to-node mesh, since route reflector or external peer topologies have different expected peer counts.

## Review Notes
The remaining resource examples use current Calico `projectcalico.org/v3` API kinds and documented fields. The rollback snippets still require operators to substitute environment-specific values such as AS numbers, node names, IP pools, and peer addresses from their known-good configuration.
