# Validation Summary: Validate Calico etcdv3 Paths

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- etcd / etcdctl
- calicoctl
- Calico IPAM
- FelixConfiguration

## Sources Consulted
- Calico key and path prefixes: https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- calicoctl get command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl node status command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/node/status
- calicoctl ipam show command reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico FelixConfiguration resource reference: https://docs.tigera.io/calico/latest/reference/resources/felixconfig
- Calico decommission a node guide: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- etcdctl prefix query documentation: https://etcd.io/docs/v3.5/tutorials/how-to-get-key-by-prefix/
- Calico calicoctl configuration overview: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/overview

## Issues Found
- The post used obsolete or incorrect etcdv3 paths such as `/calico/v1/policy/`, `/calico/v1/host/`, `/calico/v1/ipam/v2/`, and `/calico/v1/config/`. Updated the commands to use current documented etcdv3 prefixes: `/calico/resources/v3/projectcalico.org/networkpolicies/`, `/calico/resources/v3/projectcalico.org/nodes/`, `/calico/ipam/v2/assignment/`, and `/calico/resources/v3/projectcalico.org/felixconfigurations/default`.
- The node extraction commands parsed the old host path layout. Updated the `awk` field selection to match the corrected node resource prefix.
- The IPAM example claimed to list allocated IPs directly from etcd, but the command lists IPAM assignment block keys. Reworded the comment and added `calicoctl ipam show --show-blocks`, which is the documented way to summarize IPAM pool and block usage.
- The diagram referenced `calicoctl node cleanup`, which is not a documented `calicoctl node` subcommand. Replaced it with decommissioning guidance using `calicoctl delete node <nodeName>` after the node is out of service.
- The post described `calicoctl node status` as a node check command. Reworded it to say it reports local Calico node and BGP status, matching the documented command behavior.

## Review Notes
Calico's own documentation notes that etcdv3 path prefixes may change in future releases, so automation that depends on raw etcd paths should be version-checked and treated as operational diagnostics rather than a stable public API. The post's guidance to remediate through `calicoctl` instead of direct etcd manipulation is technically sound.
