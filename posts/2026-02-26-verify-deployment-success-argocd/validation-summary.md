# Validation Summary: How to Verify Deployment Success with ArgoCD

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Argo CD
- Argo CD sync hooks and sync waves
- Argo CD Notifications
- Kubernetes Jobs and Deployments
- Kubernetes readiness and health reporting
- Prometheus HTTP API and PromQL
- Shell scripting with curl, jq, and bc

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD Notifications Triggers documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/triggers/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app rollback` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Prometheus HTTP API documentation: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- Replaced `argocd app get my-app --show-resources` with `argocd app resources my-app --output tree=detailed`, because the documented Argo CD CLI command for detailed resource health is `app resources` with `tree=detailed` output.
- Corrected the PostSync description to state that PostSync hooks run after the main sync succeeds and tracked resources are Healthy, matching Argo CD hook semantics.
- Added `BeforeHookCreation` to named hook Jobs so repeated syncs can recreate hooks cleanly after prior runs.
- Changed verification Jobs that use `jq` or `bc` from `curlimages/curl:latest` to `alpine:3.20` with explicit package installation, because the original image does not reliably provide those tools.
- Updated the custom Deployment health check to handle the Kubernetes default replica count when `spec.replicas` is omitted.
- Fixed the Prometheus verification query to calculate a 5xx error ratio instead of a raw 5xx request rate, matching the text that compares against a 1% threshold.
- Updated the Argo CD Notifications trigger to use optional chaining for `operationState` and `oncePer` for successful deployment notifications, matching current Argo CD notification guidance.

## Review Notes
The examples remain illustrative and still assume service names, endpoints, container images, Prometheus metrics, and package installation access that match the reader's environment. The Argo CD hook, notification, health customization, and CLI patterns are now aligned with current official documentation.
