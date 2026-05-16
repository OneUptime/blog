# Validation Summary: How to Set Up Longhorn Storage on Talos Linux

## Status
validated

## Post Type
Tutorial / setup guide

## Technologies Covered
- Talos Linux
- Longhorn
- Kubernetes
- Helm
- Kubernetes StorageClass and PersistentVolumeClaim resources
- Prometheus Operator ServiceMonitor
- S3-compatible Longhorn backups

## Sources Consulted
- Longhorn Talos Linux Support: https://longhorn.io/docs/1.10.0/advanced-resources/os-distro-specific/talos-linux-support/
- Longhorn Install with Helm: https://longhorn.io/docs/latest/deploy/install/install-with-helm/
- Longhorn installation requirements: https://longhorn.io/docs/latest/deploy/install/
- Longhorn v2 Data Engine prerequisites: https://longhorn.io/docs/latest/v2-data-engine/prerequisites/
- Longhorn Helm values reference: https://longhorn.io/docs/latest/references/helm-values/
- Longhorn chart v1.11.2 values and templates: https://github.com/longhorn/charts/releases/download/longhorn-1.11.2/longhorn-1.11.2.tgz
- Longhorn StorageClass parameters: https://longhorn.io/docs/latest/references/storage-class-parameters/
- Longhorn default disk and node configuration: https://longhorn.io/docs/latest/nodes-and-volumes/nodes/default-disk-and-node-config/
- Longhorn backup target documentation: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn Prometheus and Grafana setup: https://longhorn.io/docs/latest/monitoring/prometheus-and-grafana-setup/
- Talos UserVolumeConfig reference: https://www.talos.dev/v1.10/reference/configuration/block/uservolumeconfig/
- Talos disk management guide: https://www.talos.dev/v1.10/talos-guides/configuration/disk-management/
- Talos v1.10 release notes: https://www.talos.dev/v1.10/introduction/what-is-new/
- Sidero Talos Longhorn test patch: https://github.com/siderolabs/talos/blob/release-1.10/hack/test/patches/longhorn.yaml

## Issues Found
- The guide did not configure Pod Security admission for the `longhorn-system` namespace. Longhorn requires privileged pods, and Talos applies Pod Security admission by default. Added namespace creation and privileged Pod Security labels before Helm installation.
- The Helm command used `--create-namespace`, which would create an unlabeled namespace and conflict with the required Pod Security labeling step. Removed `--create-namespace` from the Helm install command after adding an explicit namespace setup command.
- The dedicated disk example only used `.machine.disks`. Talos v1.10 deprecates `.machine.disks` and recommends `UserVolumeConfig`, which mounts user volumes under `/var/mnt/<name>`. Added a Talos v1.10+ `UserVolumeConfig` example and matching kubelet extra mount.
- The Helm values set `defaultSettings.createDefaultDiskLabeledNodes: true` while describing it as creating the default disk on nodes. Longhorn only creates default disks on labeled nodes when that setting is enabled. Changed it to `false` so the example creates default disks on new nodes without requiring omitted labels.
- Added a data path note that Talos v1.10+ `UserVolumeConfig` deployments should use `/var/mnt/longhorn` instead of `/var/lib/longhorn`.

## Review Notes
The remaining examples are version-sensitive but technically valid for the versions discussed. The post pins Talos image examples to `v1.9.0`; users should continue to replace that with their cluster's Talos version, as the post already states.
