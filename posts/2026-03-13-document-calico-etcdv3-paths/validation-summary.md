# Validation Summary: Document Calico etcdv3 Paths for Operators

## Status
validated

## Post Type
Operational reference guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- etcd and etcdv3
- calicoctl
- etcdctl
- Calico IPAM
- Calico Felix and BGP components

## Sources Consulted
- Calico datastore documentation: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore
- Calico etcdv3 datastore migration documentation: https://docs.tigera.io/calico/latest/operations/datastore-migration
- Calico calicoctl etcd configuration documentation: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico calicoctl ipam show documentation: https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/show
- Calico node decommissioning documentation: https://docs.tigera.io/calico/latest/operations/decommissioning-a-node
- etcd snapshot documentation: https://etcd.io/docs/v3.6/tasks/operator/how-to-save-database/
- Calico source for v3 resource paths: https://github.com/projectcalico/calico/blob/master/libcalico-go/lib/backend/model/resource.go
- Calico source for IPAM paths: https://github.com/projectcalico/calico/blob/master/libcalico-go/lib/backend/model/block.go
- Calico source for Felix status paths: https://github.com/projectcalico/calico/blob/master/libcalico-go/lib/backend/model/statusreports.go

## Issues Found
- The path reference table used several legacy or incorrect path prefixes for current Calico etcdv3 data. Updated policy, tier, profile, node, workload endpoint, Felix configuration, and BGP entries to the `/calico/resources/v3/projectcalico.org/...` resource prefixes used by current Calico source.
- The IPAM prefix was shown as `/calico/v1/ipam/v2/`, but current Calico IPAM internals use `/calico/ipam/v2/...`. Updated the table, lifecycle diagram, and change-log example.
- The Felix freshness query referenced `/calico/felix/v1/host/<nodename>/last_updated`, which is not a current Calico status key. Updated it to the v2 last status report path format.
- The stale-node query scanned `/calico/v1/host/`, which does not match the current Node resource path. Updated it to scan `/calico/resources/v3/projectcalico.org/nodes/` and extract the correct path segment.
- The node deletion lifecycle command omitted the required node name. Updated it to `calicoctl delete node nodename`.
- The GlobalNetworkSet change-log example used `/calico/v1/policy/globalnetworksets/`, which is not the current v3 resource path. Updated it to `/calico/resources/v3/projectcalico.org/globalnetworksets/`.

## Review Notes
The `calicoctl datastore migrate export/import`, `calicoctl ipam show`, `calicoctl get nodes`, `calicoctl get networkpolicies --all-namespaces`, and `etcdctl snapshot save` examples are consistent with official command documentation. Raw etcd key paths are implementation details, so operators should re-check the exact source version they run before enforcing narrow etcd RBAC rules.
