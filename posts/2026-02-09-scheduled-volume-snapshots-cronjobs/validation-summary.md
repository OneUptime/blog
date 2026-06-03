# Validation Summary: How to Implement Scheduled Volume Snapshots with CronJobs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes CronJobs
- Kubernetes Jobs
- Kubernetes RBAC
- Kubernetes PersistentVolumeClaims
- Kubernetes CSI VolumeSnapshots and VolumeSnapshotClasses
- kubectl
- Bash
- jq
- Slack incoming webhooks

## Sources Consulted
- Kubernetes CronJob concept documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- Kubernetes VolumeSnapshot documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshots/
- Kubernetes VolumeSnapshotClass documentation: https://kubernetes.io/docs/concepts/storage/volume-snapshot-classes/
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes field selector documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/field-selectors
- Kubernetes labels and annotations reference: https://kubernetes.io/docs/reference/labels-annotations-taints
- kubectl wait reference/help output: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_wait/

## Issues Found
- The basic CronJob described a 2 AM UTC schedule but did not set `.spec.timeZone`. Added `timeZone: "Etc/UTC"` to CronJob examples so schedules are interpreted as UTC instead of the kube-controller-manager's local time zone.
- The RBAC example was insufficient for later examples. Added `watch` and `delete` permissions for VolumeSnapshots, pod read permissions for pre-flight checks, and a ClusterRole/ClusterRoleBinding for reading cluster-scoped VolumeSnapshotClasses.
- Some retention comments implied that CronJob history limits retained snapshots. Updated the comments to clarify that the schedules label snapshots for retention; actual snapshot cleanup is handled by the cleanup job.
- The pre-flight check used an unsupported field selector with `metadata.creationTimestamp>` on a custom resource. Replaced it with client-side filtering in `jq` after listing matching VolumeSnapshots.
- The notification example treated a successful `kubectl apply` as successful snapshot creation. Updated it to wait until `.status.readyToUse` is `true` before sending the success notification.
- The cleanup section implied deleting VolumeSnapshot objects always removes stored snapshots. Added a caveat for VolumeSnapshotClasses with `Retain` deletion policy.
- The monitoring script selected Jobs with a `cronjob=<name>` label that Kubernetes does not add automatically. Updated it to find Jobs through `ownerReferences` pointing to the CronJob.
- The monitoring script filtered CronJobs by `backup=snapshot`, but the examples did not set that label. Added `backup: snapshot` labels to the CronJob metadata in the examples.
- The monitoring script did not specify the `production` namespace used throughout the examples. Added a `NAMESPACE` variable defaulting to `production` and passed it to the relevant `kubectl` commands.
- The Slack webhook URL variable was unquoted. Quoted it to avoid shell parsing issues with special characters.

## Review Notes
The examples assume the cluster has the VolumeSnapshot CRDs, the snapshot controller, and a CSI driver with snapshot support installed. The `bitnami/kubectl:latest` image used in the examples currently includes `bash` and `jq`, but pinning images to known versions would make the examples more reproducible.
