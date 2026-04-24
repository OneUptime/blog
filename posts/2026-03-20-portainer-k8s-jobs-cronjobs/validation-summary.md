# Validation Summary: How to Deploy Jobs and CronJobs via Portainer

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Jobs
- Kubernetes CronJobs
- Portainer for Kubernetes
- kubectl CLI
- Portainer API
- YAML manifests

## Sources Consulted
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes Indexed Job task documentation: https://kubernetes.io/docs/tasks/job/indexed-parallel-processing-static/
- Kubernetes Downward API documentation: https://kubernetes.io/docs/concepts/workloads/pods/downward-api/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- kubectl create job reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_job/
- Kubernetes API reference for Job resources: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.29/
- Portainer Cron Jobs & Jobs documentation: https://docs.portainer.io/sts/user/kubernetes/more-resources/jobs
- Portainer API documentation: https://docs.portainer.io/api/docs
- Portainer API usage examples: https://docs.portainer.io/sts/api/examples
- Portainer kubeconfig documentation: https://docs.portainer.io/sts/user/kubernetes/kubeconfig

## Issues Found
1. **Indexed Job example was incomplete.** The parallel Job example read `batch.kubernetes.io/job-completion-index` via the Downward API, but it did not set `completionMode: Indexed`. Without indexed completion mode, Kubernetes does not assign per-completion indexes. Added `completionMode: Indexed` to make the example work as described.
2. **Portainer navigation path was incorrect.** The post said to manage Jobs through `Kubernetes > Applications` with a Jobs filter. Portainer documents Jobs and CronJobs under `Kubernetes > More Resources > Cron Jobs & Jobs`, with separate tabs for each. Updated the navigation text accordingly.
3. **Manual CronJob trigger command was not in the documented form and omitted the namespace.** The post used `kubectl create job --from=cronjob/database-backup manual-backup-$(date +%Y%m%d)`, while the official syntax is `kubectl create job NAME --from=cronjob/name`. Updated the command to `kubectl create job manual-backup-$(date +%Y%m%d) --from=cronjob/database-backup -n production` so it matches the documented syntax and the namespace used throughout the post.

## Review Notes
- The `batch/v1` API usage for both `Job` and `CronJob` is current. `batch/v1beta1` CronJob was removed in Kubernetes 1.25, and this post correctly uses `batch/v1`.
- The `timeZone` field on the CronJob is correctly version-scoped. Kubernetes documents `.spec.timeZone` as stable in v1.27 and later.
- The Portainer API example is plausible as written: Portainer documents `/api/endpoints/<id>/kubernetes` as the Kubernetes proxy base path, and Kubernetes Job resources are served under `/apis/batch/v1/namespaces/{namespace}/jobs/{name}`.
