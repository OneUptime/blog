# Validation Summary: How to Use calicoctl label with Practical Examples

## Status
validated

## Post Type
Tutorial / CLI guide

## Technologies Covered
- Calico
- calicoctl
- Kubernetes
- Calico labels and selectors
- Calico BGPPeer
- Calico IPPool
- Calico HostEndpoint
- Calico GlobalNetworkPolicy
- Bash and jq

## Sources Consulted
- Calico documentation: calicoctl label command, https://docs.tigera.io/calico/latest/reference/calicoctl/label
- Calico documentation: BGPPeer resource, https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico documentation: IPPool resource, https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico documentation: GlobalNetworkPolicy resource, https://docs.tigera.io/calico/latest/reference/resources/globalnetworkpolicy
- Calico documentation: HostEndpoint resource, https://docs.tigera.io/calico/latest/reference/resources/hostendpoint
- Calico documentation: Host endpoints overview, https://docs.tigera.io/calico/latest/reference/host-endpoints/overview

## Issues Found
- The basic syntax block described `calicoctl label <resource_type> <resource_name> <key>=<value>` as "Add or update a label." Official `calicoctl label` documentation states that updating an existing label key requires `--overwrite`; without it, the command reports an error when the key is already present. Updated the syntax block to show add and update as separate examples.

## Review Notes
- The remaining examples align with current Calico resource schemas and selector syntax. The BGP peer example uses `peerSelector` without `peerIP` or `asNumber`, which matches the documented constraint for selecting Calico nodes as peers.
