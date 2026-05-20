# Validation Summary: How to Use Argo Rollouts with ArgoCD for Progressive Delivery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Deployments
- Argo Rollouts
- ArgoCD
- GitOps
- NGINX Ingress traffic routing
- Prometheus-based AnalysisTemplates
- Blue-green and canary deployment strategies

## Sources Consulted
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Argo Rollouts installation documentation: https://argoproj.github.io/argo-rollouts/installation/
- Argo Rollouts canary documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts NGINX traffic routing documentation: https://argoproj.github.io/argo-rollouts/features/traffic-management/nginx/
- Argo Rollouts blue-green documentation: https://argoproj.github.io/argo-rollouts/features/bluegreen/
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts kubectl plugin dashboard command documentation: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_dashboard/
- Argo Rollouts kubectl plugin get rollout command documentation: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/
- Argo Rollouts FAQ for ArgoCD integration and rollback behavior: https://argoproj.github.io/argo-rollouts/FAQ/
- ArgoCD resource health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- ArgoCD upstream Rollout health customization: https://github.com/argoproj/argo-cd/blob/master/resource_customizations/argoproj.io/Rollout/health.lua

## Issues Found
- The post said a regular Kubernetes Deployment has one strategy: rolling update. Kubernetes Deployments support both `RollingUpdate` and `Recreate`, with `RollingUpdate` as the default. Updated the wording to avoid the incorrect exclusivity claim.
- The migration section implied that only the `apiVersion`, `kind`, and `strategy` need to change. That is true for the workload template, but the shown NGINX traffic-routing example also requires stable/canary Services and a matching Ingress. Added that caveat.
- The ArgoCD section implied ArgoCD only needed to know about the CRD for health display. Clarified that the Rollout CRD must be installed in the destination cluster before ArgoCD can sync Rollout resources, and that ArgoCD 2.0+ includes built-in Rollout health support.
- The ArgoCD sync behavior section included a `resource.customizations.health.argoproj.io_Rollout` snippet described as a diff customization. That key configures health, not diffing, and the minimal script was less accurate than the bundled ArgoCD Rollout health check. Replaced it with guidance to use the built-in health check or the upstream Rollout health customization for older/custom distributions.
- The monitoring section claimed the default ArgoCD UI shows current step, weight, and health. ArgoCD health support is built in, but richer rollout details require the Rollouts UI extension or Rollouts dashboard/CLI. Updated the statement.

## Review Notes
The remaining examples use current Argo Rollouts API fields and documented kubectl plugin commands. The sample manifests intentionally omit related Service, Ingress, and Prometheus setup, so they are illustrative rather than complete standalone production manifests.
