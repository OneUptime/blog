# Validation Summary: How to Implement Health Checks in ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Kubernetes Deployments, StatefulSets, Services, Jobs, and custom resources
- Argo CD Lua health customizations
- Argo CD CLI
- Kubernetes probes
- Go HTTP handlers

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/health/
- Argo CD Sync Options documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-options/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD `argocd app resources` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_resources/
- Argo CD `argocd admin settings resource-overrides health` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_admin_settings_resource-overrides_health/
- Argo CD Diffing Customization documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/diffing/
- Argo CD Declarative Setup resource exclusion documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- GitOps Engine Deployment health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health_deployment.go
- GitOps Engine Service health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health_service.go
- GitOps Engine Job health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health_job.go
- GitOps Engine StatefulSet health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health_statefulset.go

## Issues Found
- Deployment health criteria were too broad and implied Argo CD directly requires all pods to be running and ready. Updated the description to match Argo CD's rollout-style checks: observed generation, updated replicas, old replica termination, updated replica availability, and progress deadline handling.
- Service health was described as endpoint-based and Degraded when no pods match the selector. Argo CD's built-in Service health only waits on `status.loadBalancer.ingress` for `LoadBalancer` Services and otherwise treats Services as healthy. Updated the explanation, example, and troubleshooting section.
- The "Ignoring Resources from Health" example used `ignoreDifferences`, which only affects diff comparison and does not suppress health assessment. Replaced it with the `argocd.argoproj.io/ignore-healthcheck: "true"` annotation.
- The resource exclusion example was described as excluding resources only from health. Clarified that `resource.exclusions` excludes matching resources from Argo CD discovery and sync.
- `HealthCheckTimeout=300` was shown as a sync option, but it is not a documented Argo CD sync option. Replaced it with the documented `argocd app wait myapp --health --timeout 300` command.
- The section on testing custom health scripts described querying application health rather than testing Lua scripts. Added the documented `argocd admin settings resource-overrides health` command and adjusted resource health inspection to use `tree=detailed`.

## Review Notes
The Argo CD CLI was not installed in the local environment, so CLI flags were verified against the official Argo CD command reference instead of local `--help` output. The GitOps Engine repository referenced for health implementation is archived as of 2026, but it remains the authoritative source for the health logic cited by current Argo CD documentation.
