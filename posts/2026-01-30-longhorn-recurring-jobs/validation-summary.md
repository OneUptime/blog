# Validation Summary: How to Create Longhorn Recurring Jobs

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Longhorn recurring jobs
- Longhorn snapshots and backups
- Longhorn backup targets
- Kubernetes PersistentVolumeClaims
- Kubernetes labels
- kubectl
- Cron expressions

## Sources Consulted
- Longhorn recurring snapshots and backups documentation: https://longhorn.io/docs/latest/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn backup target documentation: https://longhorn.io/docs/latest/snapshots-and-backups/backup-and-restore/set-backup-target/
- Longhorn best practices and snapshot filesystem freeze notes: https://longhorn.io/docs/latest/best-practices/
- Kubernetes labels and selectors documentation: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes kubectl reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post said only two Longhorn recurring job types exist, but current Longhorn supports additional recurring job tasks, including `filesystem-trim`, `snapshot-cleanup`, `snapshot-delete`, and force-create variants. Changed the wording to "Common job types include" and added filesystem trim to match the examples already present.
- The hourly snapshot example described `groups` as labels used to identify target volumes. In Longhorn, `groups` are recurring job groups that the job belongs to. Updated the comment.
- The execution diagram said snapshot creation freezes I/O briefly. Longhorn only freezes the filesystem when the freeze filesystem setting is enabled; otherwise it syncs before snapshotting. Updated the diagram text to "Sync or optionally freeze filesystem."
- The retention section implied `retain` applies to every recurring job type. It applies to snapshot and backup retention, while filesystem trim does not retain snapshots or backups. Scoped the explanation to snapshot and backup jobs.
- The PVC assignment section used annotations and referenced `recurringJobSelector`. Current Longhorn docs use recurring job labels on PVCs, and those labels only sync to the associated Longhorn volume after enabling `recurring-job.longhorn.io/source=enabled`. Updated the PVC YAML and commands to use labels and include the source label.
- The existing-volume commands used `kubectl annotate`, but Longhorn recurring job assignment uses labels. Changed those commands to `kubectl label`.
- Snapshot and backup monitoring commands used generic resource names that can be ambiguous in clusters with CSI snapshot CRDs. Changed them to `snapshots.longhorn.io` and `backups.longhorn.io`.
- The production S3 secret name did not match the backup target secret used earlier. Aligned it to `longhorn-backup-target-secret`.

## Review Notes
The backup-target examples use Longhorn `Setting` resources, which remain common in existing Longhorn installations. Current Longhorn documentation also documents Helm values and the `longhorn-default-resource` ConfigMap for default backup target configuration in newer releases, so future revisions could mention those installation-time options.
