# Validation Summary: Troubleshooting Cilium BGP Sessions

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Cilium BGP Control Plane
- Kubernetes
- BGP
- GoBGP
- Cilium LB IPAM
- kubectl
- Cilium CLI

## Sources Consulted
- Cilium BGP Control Plane Resources: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane Troubleshooting Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-troubleshooting/
- Cilium BGP Control Plane Operation Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium CLI command reference for `cilium bgp routes`: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_routes/
- Cilium Upgrade Guide noting removal of `CiliumBGPPeeringPolicy`: https://docs.cilium.io/en/stable/operations/upgrade/
- Cilium LoadBalancer IP Address Management documentation: https://docs.cilium.io/en/stable/network/lb-ipam/
- Kubernetes `kubectl debug` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- RFC 4271, BGP-4 finite state machine: https://www.rfc-editor.org/rfc/rfc4271

## Issues Found
- The post used the removed BGPv1 `CiliumBGPPeeringPolicy` resource. Updated the checks and decision tree to use current BGPv2 resources: `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, `CiliumBGPAdvertisement`, and `CiliumBGPNodeConfig`.
- The post described `Active` as meaning the router is not responding. Updated this to match the BGP finite state machine more accurately: BGP is trying to acquire the peer by accepting or retrying a TCP connection.
- The log filtering examples used generic BGP grep patterns and suggested `debug-verbose datapath`, which is not a BGP-specific debug setting. Replaced these with the documented Cilium BGP control plane log tags: `subsys=bgp-control-plane` and `subsys=bgp-cp-operator`.
- The post used an incorrect LB IPAM resource command, `kubectl get/describe ciliumulbippool`. Replaced it with the documented `ippools` short name.
- The post suggested checking an `IPPoolExhausted` event reason. Replaced this with documented LB IPAM pool status and service condition inspection.
- The conclusion overstated that missing routes are almost always caused by a missing IP pool or peering policy service selector mismatch. Updated it to include missing `CiliumBGPAdvertisement` and selector mismatches on the advertisement or IP pool.

## Review Notes
The `cilium bgp peers` and `cilium bgp routes advertised|available ipv4 unicast` commands match the current Cilium CLI documentation. The `kubectl debug node/worker-0 -it --image=nicolaka/netshoot` workflow is consistent with Kubernetes node debugging behavior, where the debug container runs in the node host namespaces.
