# Validation Summary: How to Tune Calico on OpenStack Ubuntu for Production

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Calico for OpenStack
- Felix
- etcd and etcdctl
- BGP, BGPConfiguration, BGPPeer, and route reflectors
- Calico IPPool and IPAM block sizes
- Ubuntu cron/systemd operations

## Sources Consulted
- Calico Felix configuration: https://docs.tigera.io/calico/latest/reference/felix/configuration
- Calico for OpenStack overview: https://docs.tigera.io/calico/latest/getting-started/openstack/overview
- Calico BGP peering and route reflector configuration: https://docs.tigera.io/calico/latest/networking/configuring/bgp
- Calico BGPConfiguration resource: https://docs.tigera.io/calico/latest/reference/resources/bgpconfig
- Calico BGPPeer resource: https://docs.tigera.io/calico/latest/reference/resources/bgppeer
- Calico IPPool resource: https://docs.tigera.io/calico/latest/reference/resources/ippool
- Calico change IP pool block size guide: https://docs.tigera.io/calico/latest/networking/ipam/change-block-size
- Calico calicoctl patch command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/patch
- etcd maintenance guide: https://etcd.io/docs/v3.6/op-guide/maintenance/

## Issues Found
- The introduction, section heading, and conclusion said the guide tuned Felix event processing batch size, but the provided Felix configuration does not set a documented batch-size parameter. Changed this to Felix refresh interval tuning, which matches the actual configuration keys.
- The etcd cron heredoc used an unquoted `EOF`, so the `$(etcdctl endpoint status ...)` command would run while creating the cron file and bake a stale revision into the script. Changed it to a quoted heredoc and assigned the revision inside the script.
- The nested `etcdctl endpoint status` command did not set `ETCDCTL_API=3`. Added `ETCDCTL_API=3` to the revision lookup.
- The etcd defragmentation command only defragmented the default endpoint. Updated it to `etcdctl defrag --cluster`, matching etcd's cluster-wide defragmentation guidance.
- The BGP section described timer tuning but only changed peering topology. Renamed it to BGP peering and replaced the incomplete route-reflector example with Calico `Node` patching, Calico node labeling, and a `BGPPeer` resource before disabling the mesh.
- The IPPool example attempted to patch `spec.blockSize` on an existing pool, but Calico documents `blockSize` as create-time only. Replaced it with a new-pool example using a non-overlapping CIDR placeholder and added a note about the required migration flow for an existing pool.
- The "Enable iBGP Route Aggregation" section used `prefixAdvertisements`, which Calico documents as per-prefix advertisement properties such as BGP communities, not a route aggregation switch. Renamed the section to "Set BGP Prefix Communities."

## Review Notes
- The Felix configuration keys used in the post are documented configuration-file parameters. Actual values should still be load-tested in a staging OpenStack cluster because the right refresh intervals and IPPool block size depend on endpoint churn, node count, and address plan.
- The etcd maintenance example is syntactically correct, but production clusters should choose compaction retention and defragmentation frequency based on workload and latency tolerance because live defragmentation can temporarily block reads and writes on a member.
