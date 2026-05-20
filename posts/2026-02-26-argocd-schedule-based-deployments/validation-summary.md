# Validation Summary: How to Implement Schedule-Based Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes CronJobs
- Kubernetes Jobs and Pods
- Prometheus and kube-state-metrics
- Git release promotion workflows

## Sources Consulted
- Argo CD Sync Windows documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync_windows/
- Argo CD Application specification documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD local user and API token documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/user-management/
- Argo CD RBAC documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD command reference for `argocd app sync`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_sync/
- Argo CD command reference for `argocd app wait`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_wait/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.34/#cronjobspec-v1-batch
- kube-state-metrics workload metrics documentation: https://github.com/kubernetes/kube-state-metrics/tree/main/docs/metrics/workload
- Argo CD release notes: https://github.com/argoproj/argo-cd/releases

## Issues Found
- The first sync window example defined a 24-hour `deny` window and a shorter `allow` window at the same time. Argo CD deny windows take precedence, so the automated syncs described in the post would not run during the Tuesday/Thursday window. Removed the broad deny window and enabled `manualSync` on the allow window.
- The post said merges at other times "queue up." Argo CD does not create a deployment queue for this case; applications remain OutOfSync until a sync is permitted. Updated the wording.
- The CronJob token setup created an Argo CD account but did not create the Kubernetes service account or Secret referenced by the CronJob. Added commands to create the Kubernetes service account and store the generated Argo CD token in the `argocd-deploy-token` Secret.
- The pre-stage diagram said the scheduled job cherry-picks changes, but the example command performs a merge. Updated the diagram label to match the command.
- The Application example omitted required destination/project context for a realistic declarative Argo CD Application. Added `project` and `destination`.
- The regional CronJob examples were described as time-zone aware but used UTC schedules in comments. Kubernetes CronJobs support `spec.timeZone`, so the examples now use local schedules with explicit IANA time zones.
- The regional CronJob examples omitted `restartPolicy`, which Jobs require to be `OnFailure` or `Never` for their Pod template. Added `restartPolicy: OnFailure`.
- Updated Argo CD example images from `v2.13.0` to `v3.4.2` to avoid recommending an outdated pinned version.

## Review Notes
The Prometheus examples use common kube-state-metrics metrics, but production alerting should usually scope the expressions by namespace and account for CronJob/job history retention so old failed Jobs do not keep alerts firing indefinitely.
