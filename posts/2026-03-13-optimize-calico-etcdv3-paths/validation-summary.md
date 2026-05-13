# Validation Summary: Optimize Calico etcdv3 Paths

## Status
validated

## Post Type
Tutorial / Operations guide

## Technologies Covered
- Calico (etcdv3 datastore and Kubernetes API datastore / KDD)
- etcd v3 (compaction, defragmentation, watch flags)
- etcdctl
- calicoctl (ipam, datastore migrate)
- Felix
- Kubernetes (DaemonSet, CronJob, kubectl)
- Mermaid diagrams

## Sources Consulted
- [Calico key and path prefixes (etcdv3)](https://docs.tigera.io/calico/latest/reference/etcd-rbac/calico-etcdv3-paths)
- [calicoctl ipam check](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/check)
- [calicoctl ipam release](https://docs.tigera.io/calico/latest/reference/calicoctl/ipam/release)
- [calicoctl datastore migrate (overview / export / import)](https://docs.tigera.io/calico/latest/reference/calicoctl/datastore/migrate/overview)
- [Migrate Calico from etcdv3 to Kubernetes datastore](https://docs.tigera.io/calico/latest/operations/datastore-migration)
- [Configuring calico/node](https://docs.tigera.io/calico/latest/reference/configure-calico-node)
- [etcd Maintenance (compaction / defragmentation)](https://etcd.io/docs/v3.5/op-guide/maintenance/)
- [etcd configuration options](https://etcd.io/docs/v3.6/op-guide/configuration/)

## Issues Found
1. **Non-existent `calicoctl ipam gc` command.** The original post recommended `calicoctl ipam gc` to garbage-collect leaked allocations. No such subcommand exists in calicoctl. The supported workflow is to write a report with `calicoctl ipam check -o <file>` and then release entries via `calicoctl ipam release --from-report=<file>`. Updated both the Mermaid diagram and the bash snippet under "Optimization 3" to reflect this workflow, and switched the check flag from `--show-all-ips` (which prints every IP) to `--show-problem-ips` (which surfaces leaks specifically — better matches the section's intent).
2. **Wrong etcdv3 key prefix for IPAM.** The post used `/calico/v1/ipam/` for IPAM key counting. That is an etcdv2-era prefix; in etcdv3, Calico stores IPAM data under `/calico/ipam/v2/` (per the official etcdv3 path reference). Updated the `etcdctl get` example in "Optimization 6".
3. **Incorrect environment variable on the calico-node DaemonSet.** The migration example set both `CALICO_DATASTORE_TYPE=kubernetes` and `DATASTORE_TYPE=kubernetes` on the calico-node DaemonSet. `calico-node` itself only consumes `DATASTORE_TYPE`; `CALICO_DATASTORE_TYPE` is a calicoctl-side variable and has no effect on the node container. Removed the redundant variable from the `kubectl set env` example in "Optimization 5".

## Review Notes
- The `--experimental-watch-progress-notify-interval` flag was experimental in etcd 3.4/3.5; in etcd 3.6 it has been promoted to `--watch-progress-notify-interval` (the experimental flag remains as an alias for now). Readers on etcd 3.6+ may want to use the non-experimental form, but the snippet remains correct for currently supported releases.
- The defragmentation CronJob pins `quay.io/coreos/etcd:v3.5.0`. That image tag still works, but operators should pin to whatever etcd version their cluster runs to avoid version skew between `etcdctl` and the server.
- Migrating from etcdv3 to KDD is more involved than the snippet suggests (it typically requires `calicoctl datastore migrate lock`, switching all calico components — including kube-controllers and Typha — and then `calicoctl datastore migrate unlock`). The post calls this out at a high level; readers should consult the full migration guide before running it in production.
- "500 nodes" is a reasonable rule-of-thumb threshold for KDD vs etcd, but the actual breakpoint depends on policy/endpoint counts and Typha presence rather than node count alone.
