# Validation Summary: Configure Calico Node Resource

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico
- Kubernetes
- Calico Node resource
- BGP
- VXLAN and IP-in-IP tunnel addressing
- calicoctl

## Sources Consulted
- Calico Node resource reference: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico BGPConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico calico/node configuration reference: https://docs.tigera.io/calico/latest/reference/configure-calico-node
- Calico calicoctl node status reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl node command overview: https://docs.tigera.io/calico/latest/reference/calicoctl/node/overview

## Issues Found
- The introduction claimed that the Node resource stores BGP router ID. The current Calico Node resource schema does not expose a general BGP router ID field, so this was changed to describe AS number overrides and peering IP addresses.
- Step 3 said `ipv4VXLANTunnelAddr` is used for VXLAN or IP-in-IP and can be set manually. Calico documents `ipv4VXLANTunnelAddr` as the VXLAN tunnel address and `bgp.ipv4IPIPTunnelAddr` as the IP-in-IP tunnel address, and both are system configured and should not be manually updated. The section was changed to review these fields instead of instructing manual configuration.
- The verification comments said Felix picks up BGP changes. Since BGP configuration is also handled by calico-node components such as confd and BIRD, the comment was changed to refer to calico-node logs more generally.
- The `calicoctl node status` verification comment was clarified to note that it should be run from the node, matching the official command guidance.

## Review Notes
The examples use current `projectcalico.org/v3` Node resource fields and valid `calicoctl` commands. The namespace used in the log example, `calico-system`, matches operator-based Calico installations, but some manifest-based installations may use `kube-system`.
