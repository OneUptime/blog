# Validation Summary: Fixing Route Advertisement Problems in Calico BGP

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Calico Open Source BGP
- Kubernetes
- BGPConfiguration, BGPPeer, Node, and IPPool Calico resources
- calicoctl
- kubectl
- Linux iptables
- AWS Security Groups
- GCP firewall rules

## Sources Consulted
- Calico BGPConfiguration resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource documentation: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico Node resource documentation: https://docs.tigera.io/calico/latest/reference/resources/node
- Calico BGP peering and route reflector documentation: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico calicoctl apply documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/apply
- Calico calicoctl node status documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Kubernetes kubectl debug reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes kubectl run reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_run/
- Kubernetes kubectl wait reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/
- RFC 4271, Border Gateway Protocol 4: https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The IPPool fix did not include `disableBGPExport: false`, which is the Calico field that controls whether routes from an IP pool are exported over BGP. Added it to both the YAML example and the apply command.
- The IPPool examples implied that `blockSize` could be changed freely during a fix. Added comments noting that the current value should be kept for an existing pool because Calico only allows `blockSize` to be set when the pool is created.
- The route reflector example disabled the node-to-node mesh before defining replacement route reflector peerings. Reordered the example so route reflector nodes and BGPPeer resources are configured before disabling the mesh, matching Calico guidance to avoid breaking pod networking.
- The route verification loop used `kubectl debug -it` inside command substitution, which can fail in non-interactive script execution. Replaced it with `kubectl debug --quiet`.
- The BGP status verification comment did not mention that `calicoctl node status` checks the local Calico node. Updated the comment to clarify that it should be run on each Calico node.

## Review Notes
The remaining examples are version-neutral for current Calico Open Source 3.32 resource schemas. The route reflector example still uses placeholder node names and one sample route reflector Node object; operators should repeat the node configuration for each chosen route reflector.
