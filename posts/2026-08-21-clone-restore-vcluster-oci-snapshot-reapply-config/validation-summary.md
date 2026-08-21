# Validation Summary: How to Restore a vCluster from an OCI Snapshot and Reapply Its Config

## Status

validated

## Post Type

Disaster recovery tutorial / operations guide

## Technologies Covered

- vCluster 0.36 snapshots, restore, clone, and configuration upgrades
- Kubernetes tenant and control plane clusters
- OCI artifacts and registries
- GitHub Container Registry (GHCR)
- Helm releases and values
- kubectl and kubeconfig files
- Velero and persistent-volume recovery
- SQLite, etcd, and external control-plane databases

## Sources Consulted

- [vCluster: Create snapshots](https://www.vcluster.com/docs/vcluster/manage/backup-restore/backup)
- [vCluster: Restore and clone snapshots](https://www.vcluster.com/docs/vcluster/manage/backup-restore/restore)
- [vCluster: Deploy configuration changes](https://www.vcluster.com/docs/vcluster/manage/deploy-changes/)
- [vCluster: Backing store configuration](https://www.vcluster.com/docs/vcluster/configure/vcluster-yaml/control-plane/components/backing-store)
- [vCluster: Migrate from deployed etcd to embedded etcd](https://www.vcluster.com/docs/vcluster/manage/migrate-etcd-backing-store)
- [vCluster: Access and expose a tenant cluster](https://www.vcluster.com/docs/vcluster/manage/accessing-vcluster)
- [vCluster: Using Velero](https://www.vcluster.com/docs/vcluster/manage/backup-restore/velero)
- vCluster CLI references: [snapshot create](https://www.vcluster.com/docs/vcluster/cli/vcluster_snapshot_create), [snapshot get](https://www.vcluster.com/docs/vcluster/cli/vcluster_snapshot_get), [create](https://www.vcluster.com/docs/vcluster/cli/vcluster_create), [restore](https://www.vcluster.com/docs/vcluster/cli/vcluster_restore), and [connect](https://www.vcluster.com/docs/vcluster/cli/vcluster_connect)
- [vCluster v0.36 release notes, including removal of CSI volume snapshot backup and restore](https://releases.loft.io/changelog/vcluster-platform-v411-vcluster-v036-operating-tenant-clusters-at-scale)
- [vCluster v0.36.0 tagged snapshot implementation](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/cli/snapshot_helm.go)
- [vCluster v0.36.0 tagged create/restore configuration handling](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/cli/create_helm.go)
- [vCluster v0.36.0 tagged in-place restore orchestration](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/cli/restore_helm.go)
- [vCluster v0.36.0 tagged connect and port-forward implementation](https://github.com/loft-sh/vcluster/blob/v0.36.0/pkg/cli/connect_helm.go)
- [Official vCluster documentation correction that removed unsupported snapshot-based backing-store migrations](https://github.com/loft-sh/vcluster-docs/commit/eb474aa5c067afe2ba85ba7a9d80985530fd1cb5)
- [GitHub Container Registry authentication and package permissions](https://docs.github.com/en/packages/working-with-a-github-packages-registry/working-with-the-container-registry)
- [Helm `get values` reference](https://helm.sh/docs/helm/helm_get_values/) and [Helm `list` reference](https://helm.sh/docs/helm/helm_list/)
- [Kubernetes `kubectl get` reference](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/)
- [OCI Distribution Specification](https://github.com/opencontainers/distribution-spec)

## Issues Found

- The opening caveat said the saved `vcluster.yaml` is never automatically reapplied after restore. In v0.36, that is accurate for an in-place `vcluster restore`, but `vcluster create --restore` uses the snapshot's Helm values when no `--values` or `--set` override is supplied. Scoped the statement to in-place restore and documented the clone override behavior.
- The clone workflow first restored with snapshot configuration and then upgraded to the reviewed Git configuration. This could start the clone with the snapshot's settings before the intended destination settings were applied. Replaced the two commands with the documented single `vcluster create --upgrade --restore --values vcluster.yaml` operation.
- The post referred to a snapshot migration procedure and implied that v0.36 supports multiple backing-store type migrations. Current v0.36 documentation explicitly disallows changing backing-store type through snapshot and restore. Replaced that guidance and clarified that deployed-etcd-to-embedded-etcd is a separate migration that retains etcd as the backing-store technology.
- The in-place restore description was limited to replica-controlled workload Pods. Official v0.36 documentation says the operation scales all workload Pods down to zero, so the wording was corrected.
- The external-database limitation implied that every restore must be performed entirely with database-native tooling. Corrected it to the documented behavior: take a native backup before `vcluster restore` because the CLI replaces the database data and cannot roll it back if restore fails.
- The automatic-cleanup statement covered every possible `vcluster create --restore` failure and treated deletion as guaranteed. Tagged source performs best-effort deletion only after the restore phase fails. Scoped the statement to that phase and added a cleanup verification instruction.
- The kubeconfig example did not account for `vcluster connect --print` remaining attached when it must provide a foreground port-forward. Added instructions to leave that process running and use another terminal, or to provide a reachable endpoint with `--server`.
- `helm get values --all` returns computed values, not rendered manifests. Changed “rendered Helm values” to “computed Helm values.”

## Review Notes

- All vCluster command names, positional arguments, and flags in the corrected post are valid for vCluster 0.36. The relevant implementation did not change between the v0.36.0 and v0.36.1 tags.
- The documented snapshot contents, `Completed` status check, OCI URL form, certificate regeneration behavior, missing persistent-volume data, sleeping-cluster limitation, and separate workload-data protection guidance are correct for v0.36.
- Omitting `--namespace` from `vcluster snapshot create/get` works when the named tenant cluster is unique. Automation can add `--namespace team-a-vcluster` to avoid ambiguity and reduce all-namespace discovery requirements.
- Interactive `docker login ghcr.io` is valid. Automated workflows should use `--password-stdin` and the least package permissions required.
- Persistent-volume restoration is provider- and application-specific. Workload writers must remain quiesced until control-plane state and volume data are restored to a consistent recovery point because an in-place vCluster restore resumes workloads when it completes.
