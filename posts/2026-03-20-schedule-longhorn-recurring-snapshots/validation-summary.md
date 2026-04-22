# Validation Summary: How to Schedule Longhorn Recurring Snapshots

## Status
validated

## Post Type
Tutorial / how-to guide

## Technologies Covered
- Longhorn RecurringJob CRD
- Longhorn snapshots and backups
- Kubernetes StorageClass
- Kubernetes kubectl
- Cron expressions

## Sources Consulted
- Longhorn 1.11.1 Recurring Snapshots and Backups: https://longhorn.io/docs/1.11.1/snapshots-and-backups/scheduling-backups-and-snapshots/
- Longhorn 1.11.1 Storage Class Parameters: https://longhorn.io/docs/1.11.1/references/storage-class-parameters/
- Longhorn 1.11.1 Settings: https://longhorn.io/docs/1.11.1/references/settings/
- Kubernetes kubectl apply reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_apply/
- Kubernetes kubectl label reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_label/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- The post claimed Longhorn recurring jobs support only `snapshot` and `backup`. Longhorn 1.11.1 also supports `backup-force-create`, `snapshot-force-create`, `snapshot-cleanup`, `snapshot-delete`, and `filesystem-trim`. Updated the operation list.
- The post described `spec.labels` as labels for volume group assignment. Longhorn applies those labels to created snapshots or backups; recurring job groups are handled by `spec.groups` and recurring-job group labels. Updated the explanation and YAML comment.
- The default recurring job group section patched `settings.longhorn.io recurring-job-max-retention`, which does not assign jobs to the default group. Replaced it with a `RecurringJob` patch that adds `default` to `spec.groups`, and clarified that the default group applies to volumes without recurring job labels.
- The StorageClass example comment said the selector referenced a recurring job group, but `isGroup: false` references a recurring job. Updated the comment.
- The monitoring command comment claimed `kubectl describe recurringjob.longhorn.io` shows last run time. Official Longhorn docs do not document that as a last-run source, so the comment now says it checks recurring job details.
- The cron examples were fenced as `bash`, but cron expressions are not Bash commands. Changed the fence to `text`.

## Review Notes
- `kubectl` is not installed in the local environment, so CLI syntax was checked against official Kubernetes reference docs instead of local `--help` output.
- Longhorn 1.11.1 is the latest stable Longhorn documentation version consulted on 2026-04-22. The post does not pin a Longhorn version.
