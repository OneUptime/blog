# Validation Summary: How to Handle One-Off Jobs with GitOps

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes Jobs
- Kubernetes CronJobs
- kubectl
- YAML
- Python

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Sync Options: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD Automated Sync Policy: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Kubernetes Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Automatic Cleanup for Finished Jobs: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes CronJobs: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- kubectl logs reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/

## Issues Found
- The versioned Job pattern said a completed Job with the same name would not be recreated, then recommended `ttlSecondsAfterFinished` cleanup. This was incomplete: Kubernetes TTL deletes the Job after completion, and if the manifest remains in Git, Argo CD can later see the resource as missing and recreate it during sync. Updated the text to clarify that the "will not be recreated" behavior only holds while the completed Job remains in the cluster, and that the manifest should be removed from Git before TTL cleanup if reruns are not desired.

## Review Notes
- The Argo CD hook annotations, hook delete policies, `SyncFail` hook usage, Kubernetes Job and CronJob API versions, `ttlSecondsAfterFinished`, `restartPolicy`, `backoffLimit`, and kubectl examples are consistent with current official documentation.
- Hooks do not run during Argo CD selective sync operations; that caveat is not required for this guide but may be useful in a future revision.
