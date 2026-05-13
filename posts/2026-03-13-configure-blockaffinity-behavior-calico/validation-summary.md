# Validation Summary: Configure BlockAffinity Behavior in Calico

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- Calico IPAM
- BlockAffinity resources
- IPPool resources
- BGP route advertisement
- Prometheus metrics

## Sources Consulted
- Calico BlockAffinity resource documentation: https://docs.tigera.io/calico/latest/reference/resources/blockaffinity
- Calico IPPool resource documentation: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico change IP pool block size documentation: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico topology-based IP address assignment documentation: https://docs.tigera.io/calico/latest/networking/ipam/assign-ip-addresses-topology
- Calico kube-controllers Prometheus metrics documentation: https://docs.tigera.io/calico/latest/reference/kube-controllers/prometheus
- Calico calicoctl get command documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- Calico calicoctl node status documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- Calico calicoctl ipam show documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico decommission node documentation: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node

## Issues Found
- The introduction said BlockAffinity tracks borrowed blocks. Updated it to state that BlockAffinity tracks block affinity to a node, while borrowed IP address details are reported by Calico IPAM.
- The IPPool example described a `/26` as 62 usable IPs after network and broadcast addresses. Calico documents `/26` IPAM blocks as 64 addresses, so the comments were corrected.
- The post showed applying an updated `blockSize` to an existing default IPPool. Calico documents `blockSize` as create-time only, so the example was changed to create a new IPPool and verify that pool.
- The stale-node diagnostic command collected Kubernetes nodes but did not compare them to BlockAffinity nodes. The Python snippet now prints nodes with blocks and stale nodes.
- The cleanup command deleted a BlockAffinity directly. Calico's node decommissioning guidance uses `calicoctl delete node <nodeName>` to remove node-associated resources, so the cleanup command was changed.
- The BGP section implied every BlockAffinity always maps to one advertised route. The explanation was qualified for BGP mode with export enabled and notes that borrowed addresses use more specific routes.
- The node-pool verification command grepped BlockAffinity output for zone labels, which would not be present. It now verifies IPPools and Kubernetes node labels.
- The Prometheus metric `calico_ipam_blocks_per_node` was not found in current Calico docs. It was changed to `ipam_blocks`, with `ipam_blocks_per_node` noted for legacy integrations.

## Review Notes
The post is now technically consistent with current Calico Open Source documentation. Some commands still depend on cluster configuration and Calico datastore mode, especially direct inspection of internal BlockAffinity resources.
