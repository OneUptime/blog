# Validation Summary: Configure Calico etcdv3 Paths

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Calico Open Source
- Kubernetes
- etcd / etcdv3 datastore
- etcdctl
- calicoctl

## Sources Consulted
- Calico key and path prefixes: https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths
- Calico etcd datastore configuration for calicoctl: https://docs.tigera.io/calico/latest/operations/calicoctl/configure/etcd
- Calico Kubernetes controllers configuration resource: https://docs.tigera.io/calico/latest/reference/resources/kubecontrollersconfig
- Calico Kubernetes controllers component configuration: https://docs.tigera.io/calico/latest/reference/kube-controllers/configuration
- Calico datastore overview: https://docs.tigera.io/calico/latest/getting-started/kubernetes/hardway/the-calico-datastore

## Issues Found
- The post used obsolete or incorrect Calico etcdv3 paths under `/calico/v1/`, including `/calico/v1/policy/`, `/calico/v1/host/`, `/calico/v1/ipam/v2/`, and `/calico/v1/config/`. I updated the path diagram, examples, and conclusion to use the documented current prefixes: `/calico/resources/v3/projectcalico.org/`, `/calico/ipam/v2/`, `/calico/felix/v1/`, and `/calico/felix/v2/`.
- The post claimed Calico supports configuring a root etcd path prefix and showed `CALICO_ETCD_PREFIX`. I could not verify that as a documented current Calico option, so I replaced it with supported etcd datastore configuration using `DATASTORE_TYPE=etcdv3` and `ETCD_ENDPOINTS`.
- The compaction example patched `FelixConfiguration` with `etcdV3CompactionPeriod`, but that field belongs to `KubeControllersConfiguration`. I changed the command to patch `kubecontrollersconfiguration default`.
- The host integrity check queried `/calico/v1/host/<node>/`, which is not the documented current node resource prefix. I changed it to query `/calico/resources/v3/projectcalico.org/nodes/<node>`.

## Review Notes
- The Calico documentation notes that etcd path prefixes may change in future releases, so these examples should be treated as operational diagnostics and RBAC guidance rather than a stable application API.
- Direct `etcdctl` reads are useful for inspection, but the post correctly advises using `calicoctl` for normal Calico data management.
