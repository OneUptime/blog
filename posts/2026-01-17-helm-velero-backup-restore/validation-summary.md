# Validation Summary: Kubernetes Backup and Restore with Helm and Velero

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes
- Helm
- Velero
- Velero Backup, Restore, and Schedule CRDs
- Velero provider plugins for AWS, GCP, Azure, and S3-compatible storage
- Velero node-agent and file system backup
- CSI volume snapshots
- Prometheus and Grafana monitoring

## Sources Consulted
- Velero Helm chart values and templates: https://github.com/vmware-tanzu/helm-charts/tree/main/charts/velero
- Velero Backup API type documentation: https://velero.io/docs/v1.17/api-types/backup/
- Velero Restore API type documentation: https://velero.io/docs/v1.17/api-types/restore/
- Velero Schedule API type documentation: https://velero.io/docs/v1.17/api-types/schedule/
- Velero restore hooks documentation: https://velero.io/docs/main/restore-hooks/
- Velero backup hooks documentation: https://velero.io/docs/v1.8/backup-hooks/
- Velero locations documentation: https://velero.io/docs/main/locations/
- Velero CSI support documentation: https://velero.io/docs/main/csi/
- Velero supported providers documentation: https://velero.io/docs/main/supported-providers/
- Velero CLI source for backup and restore flags: https://github.com/vmware-tanzu/velero/tree/main/pkg/cmd/cli
- Velero provider plugin releases: https://github.com/velero-io/velero-plugin-for-aws/releases, https://github.com/velero-io/velero-plugin-for-gcp/releases, https://github.com/velero-io/velero-plugin-for-microsoft-azure/releases

## Issues Found
- Updated AWS, GCP, Azure, and MinIO plugin images from `v1.8.0` to `v1.14.1`. The old versions were v1.12-era plugin releases and are outdated for current Velero chart usage.
- Replaced the outdated "Restic" wording with node-agent/Kopia/file system backup terminology where the post described current Helm chart configuration.
- Fixed invalid Helm values under `nodeAgent` by replacing ignored `privileged: true` keys with `nodeAgent.containerSecurityContext.privileged: true`, which is the chart-supported field.
- Replaced the invalid GCP credential placeholder containing `...` with a syntactically valid service account JSON structure using placeholders.
- Removed the `replicaCount: 2` and `podDisruptionBudget` production values because the VMware Tanzu Velero chart hardcodes the Velero server Deployment to one replica and does not expose those values.
- Removed the obsolete `velero-plugin-for-csi` init container from the production values. Velero CSI support has been merged into Velero since v1.14, so the separate CSI plugin should not be installed with current Velero releases.
- Corrected the restore hook example from an init-container hook that attempted to connect to `localhost` before the application container started into a post-restore exec hook, matching Velero's documented hook model.
- Renamed the restore section from "Restore with Transformations" to "Restore with Hooks" because the example uses Velero restore hooks rather than resource modifiers.

## Review Notes
The remaining Backup, Schedule, Restore, Helm, and CLI examples match the documented Velero CRD fields and command flags. The monitoring examples use Velero metric names that are present in the Helm chart's own PrometheusRule examples, but real alerting rules should usually add schedule/location label filters and absent-series handling for production use.
