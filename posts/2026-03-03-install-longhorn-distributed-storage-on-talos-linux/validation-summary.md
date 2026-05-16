# Validation Summary: How to Install Longhorn Distributed Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / step-by-step guide

## Technologies Covered
- Longhorn (Rancher distributed block storage for Kubernetes)
- Talos Linux (immutable Kubernetes OS by Sidero Labs)
- Talos system extensions (iscsi-tools, util-linux-tools)
- Talos Image Factory
- Kubernetes (StorageClass, PersistentVolumeClaim, Ingress, Pod)
- Helm
- kubectl / talosctl
- S3-compatible object storage (for backups)

## Sources Consulted
- Longhorn official docs: Talos Linux Support — https://longhorn.io/docs/1.10.0/advanced-resources/os-distro-specific/talos-linux-support/
- Longhorn Settings Reference — https://longhorn.io/docs/latest/references/settings/
- Longhorn Scheduling Backups and Snapshots — https://longhorn.io/docs/latest/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn Set Backup Target — https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn deploy manifest — https://github.com/longhorn/longhorn/blob/master/deploy/longhorn.yaml
- Talos Image Factory — https://factory.talos.dev
- Sidero Labs extensions repo — https://github.com/siderolabs/extensions

## Issues Found

1. **`files:` block in the Talos machine config patch was incorrect.** The original patch included:
   ```yaml
   files:
     - content: ""
       path: /var/lib/longhorn
       op: create
   ```
   `machine.files` in Talos creates files, not directories — this would create an empty file at `/var/lib/longhorn` and break the `kubelet.extraMounts` bind mount immediately below it. Removed the block. The bind mount on `/var/lib/longhorn` is sufficient; Talos creates the source path automatically.

2. **Extension installation method was inaccurate.** The original post tried to install the `siderolabs/iscsi-tools` extension by patching `machine.install.extensions` via `talosctl patch machineconfig`. Talos system extensions cannot be installed at runtime that way — they have to be baked into the installer image. Replaced that snippet with a short description of how to build a custom schematic with the Talos Image Factory and use `talosctl upgrade --image factory.talos.dev/installer/<schematic-id>:<talos-version>` to apply it.

3. **Missing required extension.** The current Longhorn Talos support doc requires **both** `siderolabs/iscsi-tools` **and** `siderolabs/util-linux-tools`. The original post only listed `iscsi-tools`. Added `util-linux-tools` to the prose.

4. **Outdated extension version pin.** The original pinned `iscsi-tools:v0.1.4`, which is several Talos releases stale. Removed the version pin in favor of referencing the extension by name and letting Image Factory select the version that matches the user's Talos release.

5. **Unnecessary sysctl removed.** `vm.max_map_count: "262144"` is not a Longhorn requirement (it is the well-known Elasticsearch tuning) and was removed to avoid implying it is needed for Longhorn to function.

## Review Notes
- All Longhorn Helm `defaultSettings` (`guaranteedInstanceManagerCPU`, `defaultDataLocality: best-effort`, `replicaAutoBalance: best-effort`, `createDefaultDiskLabeledNodes`, etc.) are valid for current Longhorn (1.6+). `guaranteedInstanceManagerCPU` correctly supersedes the older `guaranteedEngineManagerCPU` / `guaranteedReplicaManagerCPU` settings that were merged in 1.5.
- StorageClass parameters (`numberOfReplicas`, `staleReplicaTimeout`, `fromBackup`, `fsType`, `dataLocality: strict-local`, `fsType: xfs`) are all valid. Note for readers: Longhorn requires XFS volumes to be at least 300 MiB.
- `RecurringJob` at `apiVersion: longhorn.io/v1beta2` is current; fields used (`cron`, `task`, `groups`, `retain`, `concurrency`) are correct.
- Backup target URL format `s3://<bucket>@<region>/` and credential env keys (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_ENDPOINTS`) match the Longhorn docs.
- The `kubectl patch settings.longhorn.io ...` syntax is correct; the Setting CRD takes a top-level `value` string.
- The `csi.*ReplicaCount` Helm values are valid but require enough nodes to schedule the replicas; on a 3-worker cluster the defaults are fine.
- Resource requests/limits in the values file apply to the Longhorn manager-style components — operators may want to tune these for production workloads, but the values shown are reasonable defaults.
