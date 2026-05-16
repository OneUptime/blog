# Validation Summary: How to Troubleshoot etcd Issues in Talos Linux

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Talos Linux
- talosctl
- etcd
- Kubernetes control plane
- Prometheus metrics

## Sources Consulted
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli
- Talos Linux etcd maintenance guide: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/etcd-maintenance
- Talos Linux disaster recovery guide: https://docs.siderolabs.com/talos/v1.12/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery
- etcd disaster recovery documentation: https://etcd.io/docs/v3.6/op-guide/recovery/
- etcd system limits documentation: https://etcd.io/docs/v3.6/dev-guide/limit/
- etcd failure modes documentation: https://etcd.io/docs/v3.5/op-guide/failures/

## Issues Found
- The post used `talosctl services etcd`, but the documented Talos command is `talosctl service etcd`. Updated all service status examples.
- The out-of-space section implied a manual Talos compact command before defragmentation. Talos documents `talosctl etcd defrag`, Kubernetes API server compaction, and increasing `cluster.etcd.extraArgs.quota-backend-bytes` when the in-use database size is close to quota. Updated the guidance accordingly.
- The post described the etcd quota as `2GB`. Updated it to `2 GiB`, matching Talos and etcd documentation.
- The reset examples used a generic graceful reset. Talos disaster recovery guidance uses `reset --graceful=false --reboot --system-labels-to-wipe=EPHEMERAL` when wiping etcd data while preserving node configuration. Updated the join and corruption recovery examples.
- The post used a nonexistent `talosctl etcd snapshot restore` command. Talos recovery from an etcd snapshot is performed with `talosctl bootstrap --recover-from=<snapshot>`. Updated the restore example.
- The high-memory checklist recommended running compaction directly. Updated it to verify Kubernetes compaction and defragment etcd when needed.

## Review Notes
The remaining commands and concepts align with the current Talos CLI and etcd operational model. Future improvements could add stronger warnings that `talosctl etcd remove-member` should only be used for broken members and that `talosctl etcd defrag` should be run on one member at a time because it is resource-intensive.
