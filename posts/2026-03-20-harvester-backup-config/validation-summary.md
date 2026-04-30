# Validation Summary: How to Export and Restore Harvester Configuration

## Status
validated

## Post Type
Guide

## Technologies Covered
- Harvester
- RKE2
- Kubernetes
- KubeVirt
- Longhorn
- S3-compatible object storage
- Linux cron

## Sources Consulted
- Harvester VM Backup, Snapshot & Restore: https://docs.harvesterhci.io/v1.7/vm/backup-restore/
- Harvester Settings: https://docs.harvesterhci.io/v1.7/advanced/index/
- Harvester Cluster Network documentation: https://docs.harvesterhci.io/v1.7/networking/index/
- Harvester post-install configuration guidance: https://docs.harvesterhci.io/v1.7/install/update-harvester-configuration/
- Harvester API: Create a Namespaced Virtual Machine: https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine/
- Harvester API: Create a Namespaced Virtual Machine Restore: https://docs.harvesterhci.io/v1.7/api/create-namespaced-virtual-machine-restore/
- Harvester API: List Namespaced Virtual Machine Images: https://docs.harvesterhci.io/v1.7/api/list-namespaced-virtual-machine-image/
- Harvester API: List Namespaced Network Attachment Definitions: https://docs.harvesterhci.io/v1.7/api/list-namespaced-network-attachment-definition/
- RKE2 Backup and Restore: https://docs.rke2.io/datastore/backup_restore
- RKE2 Server Configuration Reference: https://docs.rke2.io/reference/server_config
- Kubernetes imperative object configuration guidance: https://kubernetes.io/docs/tasks/manage-kubernetes-objects/imperative-config/
- kubectl get reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/
- Longhorn backup target documentation: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn settings update guidance: https://longhorn.io/docs/latest/advanced-resources/deploy/customizing-default-settings/

## Issues Found

1. **Outdated `kubectl export` references**: Replaced `kubectl export` in the backup table with `kubectl get -o yaml`, which is the current documented way to capture live object manifests.

2. **Wrong backup-target configuration API**: The original post patched Longhorn settings in `longhorn-system`, but Harvester VM backups use Harvester's `backup-target` setting (`settings.harvesterhci.io`). Updated the command and UI path accordingly.

3. **Missing Harvester immutability caveat for RKE2 config changes**: Added a note that direct node-level RKE2 configuration changes must be persisted using Harvester's post-install configuration workflow so they survive reboot.

4. **Incorrect resource scope and resource names in export commands**: Corrected commands so cluster-scoped Harvester settings are exported without a namespace, VM images are exported across namespaces, and network/VM resources use their current API resource names.

5. **Automation example assumed mutable Harvester nodes**: The original cron-based script implied installation on a Harvester node. Updated the guidance to run the script on an external admin or automation host because Harvester's OS is immutable.

6. **Restore guidance was incomplete**: Added the requirement to sanitize live manifests before reapplying them, added the required `virtualMachineBackupNamespace` field to the `VirtualMachineRestore` manifest, and noted that target-cluster VM images must exist with matching names.

## Review Notes
- Harvester restore behavior is version-sensitive. Current Harvester v1.7 documentation notes support for Longhorn V2 volume backup and snapshot operations, while older Harvester versions had narrower support.
- The post now accurately distinguishes between cluster-state backups (RKE2 etcd snapshots), VM backup targets in Harvester, and exported Kubernetes manifests used for configuration recovery.
