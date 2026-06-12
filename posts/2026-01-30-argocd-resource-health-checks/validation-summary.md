# Validation Summary: How to Build ArgoCD Resource Health Checks

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD resource health checks
- Argo CD sync waves
- Kubernetes ConfigMaps and custom resources
- Lua health check scripts
- cert-manager Certificates
- Argo Rollouts
- External Secrets Operator
- Zalando Postgres Operator

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd admin settings resource-overrides health` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_health/
- Kubernetes `kubectl logs` command reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes CronJob API reference: https://kubernetes.io/docs/reference/kubernetes-api/batch/cron-job-v1/
- cert-manager Certificate API documentation: https://cert-manager.io/docs/reference/api-docs/
- Argo Rollouts FAQ: https://argo-rollouts.readthedocs.io/en/stable/FAQ/
- External Secrets Operator ExternalSecret documentation: https://external-secrets.io/latest/api/externalsecret/
- Zalando Postgres Operator cluster status constants: https://raw.githubusercontent.com/zalando/postgres-operator/master/pkg/apis/acid.zalan.do/v1/const.go

## Issues Found
- Corrected the health evaluation flow diagram to show custom Lua health checks being considered before built-in Go-based checks. Argo CD documentation states configured custom health checks override Go-based built-in health checks.
- Changed the fallback wording from "mark as healthy" to skipping resource-specific health assessment when no health check exists. This avoids implying that every resource without a check receives an explicit Healthy status.
- Updated the custom Lua script status list to the statuses documented for custom health checks: Healthy, Progressing, Degraded, and Suspended.
- Added the default Progressing status and empty message to the Argo CD Application health check example, matching the official app-of-apps restoration example.
- Reworded the CronJob example description because the script checks `status.lastScheduleTime`, not whether the CronJob ran successfully recently.
- Expanded the Zalando Postgres Operator degraded statuses to include `UpdateFailed` and `Invalid`, and changed the unknown fallback to `Progressing` instead of returning an undocumented custom health status.
- Changed Argo Rollouts and generic CRD fallback statuses from `Unknown` to `Progressing` to stay within the documented custom Lua health statuses.
- Updated the complex-resource decision tree fallback from `Return Unknown` to `Return Progressing`.
- Corrected sync wave comments so the Namespace wave is described as being applied first, not as waiting for Namespace health, and clarified that the application wave waits on database health only if the database resource has a health check.
- Corrected the application-controller log command to use the standard label selector instead of addressing it as a Deployment.

## Review Notes
The examples are intentionally generic and should still be tested against the exact CRD versions installed in a target cluster because CRD status schemas are owned by each controller and can vary by version.
