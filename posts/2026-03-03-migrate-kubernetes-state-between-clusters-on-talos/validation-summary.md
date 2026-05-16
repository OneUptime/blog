# Validation Summary: How to Migrate Kubernetes State Between Clusters on Talos

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (talosctl, etcd snapshots, bootstrap recovery)
- Kubernetes (kubectl, resource export/import)
- Velero v1.14.0 (backup/restore with node-agent / fs-backup)
- etcd / etcdctl (snapshot status)
- ArgoCD (GitOps Application CRD)
- yq (mikefarah v4 syntax for resource sanitization)
- rsync via `instrumentisto/rsync-ssh` image (PV data migration)
- PostgreSQL (`pg_dump`/`psql`) for application-level migration

## Sources Consulted
- Velero v1.14 install & FS backup docs: https://velero.io/docs/v1.14/customize-installation/ and https://velero.io/docs/v1.14/file-system-backup/
- Velero resource filtering (namespace wildcards): https://velero.io/docs/v1.14/resource-filtering/
- Talos disaster recovery (v1.7 / v1.9): https://docs.siderolabs.com/talos/v1.9/build-and-extend-talos/cluster-operations-and-maintenance/disaster-recovery and https://www.talos.dev/v1.7/advanced/disaster-recovery/
- Talos production notes / `talosctl gen` reference: https://www.talos.dev/v1.8/introduction/prodnotes/
- ArgoCD manifest install URL: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml (Application CRD spec confirmed against argoproj.io/v1alpha1)

## Issues Found
1. **Incorrect secrets handling in Approach 2 (etcd Snapshot and Restore).** The original instructions told users to run `talosctl gen secrets -o new-secrets.yaml` and then bootstrap a new cluster from an etcd snapshot using that freshly generated bundle. This is wrong and contradicts the note immediately below it. An etcd snapshot contains Secrets encrypted with the source cluster's encryption key, plus ServiceAccount tokens and kubelet client certs signed by the source cluster's CAs. Booting with a new secrets bundle leaves restored Secrets undecryptable and prevents worker nodes from rejoining. Fixed by removing the `talosctl gen secrets` step and instructing the reader to reuse the original `secrets.yaml` (or extract it from a backed-up controlplane config via `talosctl gen secrets --from-controlplane-config controlplane.yaml -o secrets.yaml`). The trailing note was expanded to make the requirement explicit and to mention encryption keys, not just CA certificates.

## Review Notes
- Velero flag set (`--use-node-agent`, `--default-volumes-to-fs-backup`) is correct for v1.14 (these replaced `--use-restic` / `--default-volumes-to-restic` in v1.10+). If readers upgrade past v1.14 they should check the CLI reference, but no action needed today.
- `--include-namespaces '*'` is functionally equivalent to omitting the flag; both are valid in v1.14.
- `talosctl bootstrap --recover-from=...` is the correct disaster-recovery flag. If the snapshot was copied directly from etcd's data directory (rather than produced by `etcd snapshot`), `--recover-skip-hash-check` would also be required. Not currently called out, but the post uses `talosctl etcd snapshot` which produces a valid hash, so this is fine.
- The `yq` examples assume mikefarah `yq` v4 syntax; users on the Python `yq` would need different commands. Not an error, but worth noting.
- The `kubectl run rsync-source --overrides=...` example omits `--restart=Never`; modern `kubectl run` creates a Pod by default so this still works, but the pod will inherit `restartPolicy: Always`. Functional, not incorrect.
