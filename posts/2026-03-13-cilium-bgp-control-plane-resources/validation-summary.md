# Validation Summary: Cilium BGP Control Plane Resources

## Status
validated

## Post Type
Technical reference guide

## Technologies Covered
- Cilium BGP Control Plane
- Kubernetes custom resources
- BGP
- Cilium LB IPAM
- kubectl

## Sources Consulted
- Cilium BGP Control Plane installation documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium LB IPAM documentation: https://docs.cilium.io/en/stable/network/lb-ipam/
- Cilium upgrade guide, custom resource version notes: https://docs.cilium.io/en/stable/operations/upgrade/

## Issues Found
- The post presented `CiliumBGPPeeringPolicy` as the primary BGP resource. Updated the post to make `CiliumBGPClusterConfig` the primary current resource and moved `CiliumBGPPeeringPolicy` to a legacy section because Cilium removed BGPv1 in Cilium 1.19.
- The current BGP examples used deprecated `apiVersion: cilium.io/v2alpha1`. Updated current Cilium BGP resources and `CiliumLoadBalancerIPPool` to `apiVersion: cilium.io/v2`.
- The `CiliumLoadBalancerIPPool` example used `.spec.cidrs`, which is not the current documented field. Changed it to `.spec.blocks`.
- The post implied `CiliumLoadBalancerIPPool` alone causes LoadBalancer service advertisement. Added `CiliumBGPAdvertisement` because Cilium uses it to define advertised prefixes and service VIPs.
- The `CiliumBGPClusterConfig` example omitted `nodeSelector`, which is required to apply configuration to nodes. Added a node selector.
- The status commands mixed up resources, including using `kubectl get ciliumbgpclusterconfig` under IP pool allocations. Updated commands to list BGP cluster configs, list load balancer IP pools, and describe the BGP cluster config.
- The relationship diagram showed the legacy policy as central and did not include `CiliumBGPAdvertisement`. Updated it to reflect the current BGP resource relationships.

## Review Notes
The post is now accurate for current Cilium releases using the stable `cilium.io/v2` BGP APIs. The legacy `CiliumBGPPeeringPolicy` example is retained only as historical context for older clusters.
