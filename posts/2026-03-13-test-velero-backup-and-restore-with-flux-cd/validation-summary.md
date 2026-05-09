# Validation Summary: How to Test Velero Backup and Restore with Flux CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Velero
- Flux CD
- Kubernetes
- Kubernetes CronJob
- Kubernetes Deployment
- Kubernetes PersistentVolumeClaim
- kubectl

## Sources Consulted
- Velero Backup Storage Locations and Volume Snapshot Locations: https://velero.io/docs/v1.18/locations/
- Velero Resource Filtering: https://velero.io/docs/v1.18/resource-filtering/
- Velero Restore API Type: https://velero.io/docs/v1.18/api-types/restore/
- Velero Restore Reference: https://velero.io/docs/v1.18/restore-reference/
- Flux Notification Alert documentation: https://fluxcd.io/flux/components/notification/alerts/
- Flux Notification API reference: https://fluxcd.io/flux/components/notification/api/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Persistent Volumes documentation: https://kubernetes.io/docs/concepts/storage/persistent-volumes/
- Kubernetes kubectl JSONPath documentation: https://kubernetes.io/docs/reference/kubectl/jsonpath/

## Issues Found
- The scheduled-backup selector used `schedule=production-apps-hourly`, which is not the standard Velero schedule label. Changed it to `velero.io/schedule-name=production-apps-hourly`.
- The test Deployment used two replicas with one `ReadWriteOnce` PVC, which can fail on multi-node clusters. Changed it to one replica.
- The test wrote data immediately after applying the Deployment, before the workload was guaranteed ready. Added `kubectl rollout status` before `kubectl exec`.
- The backup and restore status checks used `velero ... get -o jsonpath`, but Velero CLI output formats are not Kubernetes JSONPath. Changed those checks to `kubectl get backups.velero.io` and `kubectl get restores.velero.io`.
- The automated CronJob selected backups with `velero backup get -o jsonpath` and ran `velero` inside a kubectl-only image. Changed it to use `kubectl` against Velero CRDs and create a `Restore` resource directly.
- The automated CronJob selected the first backup after sorting by creation timestamp, which would choose the oldest backup. Changed it to use Kubernetes JSONPath negative indexing to select the newest backup.
- The automated CronJob reused the same restore name for all runs on a day. Added timestamp precision to seconds.
- The restore validation waited for pods by label, which can fail if no matching pod exists at the instant the command starts. Changed it to wait for the Deployment rollout.
- The PVC deletion verification expected "No resources found" after deleting the namespace. Corrected the expectation to a NotFound error because the namespace itself is gone.
- The Flux Alert manifest used `notification.toolkit.fluxcd.io/v1`, but the current Flux Alert resource is documented under `notification.toolkit.fluxcd.io/v1beta3`. Updated the API version.

## Review Notes
The examples assume the Velero namespace is `velero`, the backup storage location and volume snapshot location are both named `primary`, and the `velero-restore-tester` ServiceAccount has RBAC to manage namespaces, Velero Backup and Restore resources, and the restored workload resources.
