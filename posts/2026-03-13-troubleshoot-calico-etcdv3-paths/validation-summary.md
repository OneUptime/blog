# Validation Summary: Troubleshoot Calico etcdv3 Paths

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Calico Open Source
- calicoctl
- Kubernetes
- etcd / etcdctl
- Calico etcdv3 datastore paths
- Calico IPAM

## Sources Consulted
- Calico key and path prefixes: https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- Configure calicoctl to connect to an etcd datastore: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- calicoctl get reference: https://docs.tigera.io/calico/latest/reference/calicoctl/get
- calicoctl delete reference: https://docs.tigera.io/calico/latest/reference/calicoctl/delete
- calicoctl ipam check reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check
- calicoctl ipam release reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release
- calicoctl ipam show reference: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show/
- Decommission a node: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- etcdctl prefix query documentation: https://etcd.io/docs/v3.5/tutorials/how-to-get-key-by-prefix/

## Issues Found
- The policy examples used `/calico/v1/policy/`, which is not the current Calico etcdv3 resource path. Updated the commands to use `/calico/resources/v3/projectcalico.org/globalnetworkpolicies/`.
- The stale host entry example used `/calico/v1/host/`. Updated it to inspect `/calico/resources/v3/projectcalico.org/nodes/`, matching the documented etcdv3 node resource prefix, and corrected the `awk` field used to extract node names from that path.
- The corrupted policy example used an old policy path and described malformed YAML in etcd. Updated it to a v3 global network policy key path and described the raw value as JSON.
- The IPAM remediation suggested `calicoctl ipam gc`, which is not a documented current calicoctl IPAM subcommand. Replaced it with the documented `calicoctl ipam check -o report.json` and `calicoctl ipam release --from-report=report.json` workflow.
- The wrong prefix section suggested checking `FelixConfiguration` for an etcd prefix and referred to a custom `/custom-calico/` prefix. Updated it to a datastore configuration mismatch, using `calicoctl` configuration guidance and the documented `/calico/resources/v3/` key layout.

## Review Notes
The post is technically relevant and useful after correction. Direct `etcdctl del` remains a high-risk recovery action; the post already advises preferring `calicoctl`, but future revisions could add stronger backup and maintenance-window guidance before deleting raw datastore keys.
