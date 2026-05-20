# Validation Summary: How to Deploy Jobs and CronJobs with ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Kubernetes Jobs
- Kubernetes CronJobs
- GitOps
- Argo CD resource hooks, sync phases, sync waves, and hook delete policies
- Argo CD health checks and resource exclusions
- kubectl and argocd CLI commands

## Sources Consulted
- Argo CD Resource Hooks: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Resource Exclusion/Inclusion: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/#resource-exclusioninclusion
- Argo CD `argocd app get-resource` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get-resource/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes Job documentation and generated API reference: https://kubernetes.io/docs/concepts/workloads/controllers/job/ and https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.35/
- Kubernetes TTL-after-finished controller documentation: https://kubernetes.io/docs/concepts/workloads/controllers/ttlafterfinished/
- Kubernetes Indexed Job task documentation: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/

## Issues Found
- The section on CronJob-created Jobs used `ignoreDifferences` as if it controlled resource tracking or application-tree visibility. `ignoreDifferences` controls diff comparison for tracked resources, not whether generated Jobs are discovered or displayed. Replaced the snippet with an `argocd-cm` `resource.exclusions` example and added a caveat that this ignores Job resources entirely.
- The CronJob health explanation was too broad. Updated it to state that Argo CD derives CronJob health from CronJob status and can mark CronJobs degraded when the last scheduled Job failed or progressing while the last scheduled Job is running.
- The custom CronJob health check could return an empty health object when `obj.status` was nil. Added a default `Progressing` status and message before checking CronJob status fields.
- The Argo CD CLI example used `argocd app get --resource ...`, which is not a current `argocd app get` option. Replaced it with `argocd app get-resource myapp --group batch --kind Job --resource-name <job-name>`.
- The log command used `kubectl logs job/daily-report`, but CronJob-created Jobs have generated names rather than the CronJob name. Replaced it with `kubectl logs job/<job-name> -n batch-jobs`.

## Review Notes
The remaining Kubernetes manifests use current `batch/v1` APIs and valid fields for Jobs and CronJobs. The Argo CD hook phases, hook delete policies, and sync-wave annotations align with official Argo CD documentation. The Indexed Job example is valid for supported Kubernetes versions; Kubernetes also exposes the completion index automatically as `JOB_COMPLETION_INDEX`, so the explicit downward API environment variable is optional.
