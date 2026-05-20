# Validation Summary: How to Configure Health Checks for Argo Rollouts in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes custom resources
- Lua health checks
- kubectl and Argo Rollouts kubectl plugin

## Sources Consulted
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argoproj.io/Rollout` health customization: https://raw.githubusercontent.com/argoproj/argo-cd/master/resource_customizations/argoproj.io/Rollout/health.lua
- Argo CD `argoproj.io/AnalysisRun` health customization: https://raw.githubusercontent.com/argoproj/argo-cd/master/resource_customizations/argoproj.io/AnalysisRun/health.lua
- Argo CD `argoproj.io/Experiment` health customization: https://raw.githubusercontent.com/argoproj/argo-cd/master/resource_customizations/argoproj.io/Experiment/health.lua
- Argo Rollouts API type definitions: https://raw.githubusercontent.com/argoproj/argo-rollouts/master/pkg/apis/rollouts/v1alpha1/types.go
- Argo Rollouts AnalysisRun API type definitions: https://raw.githubusercontent.com/argoproj/argo-rollouts/master/pkg/apis/rollouts/v1alpha1/analysis_types.go
- Argo Rollouts Experiment API type definitions: https://raw.githubusercontent.com/argoproj/argo-rollouts/master/pkg/apis/rollouts/v1alpha1/experiment_types.go
- Argo Rollouts `kubectl argo rollouts status` command reference: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_status/
- Argo Rollouts `kubectl argo rollouts get rollout` command reference: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_get_rollout/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/

## Issues Found
- The post claimed Argo CD built-in Argo Rollouts health checks start in Argo CD 2.4. The bundled `argoproj.io/Rollout` health customization exists in earlier Argo CD releases, so the version-specific claim was removed.
- The rollout health mapping listed `ScaledDown` as a Rollout state. `ScaledDown` is not one of the current `RolloutPhase` API values, so that row was removed.
- The resource customization section said to install the latest health check logic. Because custom snippets are overrides rather than a general extension installer, the wording now says to override the built-in logic for a workflow.
- The `AnalysisRun` health check mapped `Inconclusive` to `Progressing`. Argo CD's bundled `AnalysisRun` health check maps inconclusive analysis to `Unknown`, so the snippet was corrected.
- The `Experiment` health check did not explicitly handle the `Pending` phase from the current Experiment API. A `Pending` branch was added and mapped to `Progressing`.
- The paused rollout YAML example looked like a complete Rollout manifest but omitted required fields such as selector and pod template. The comment now labels it as a strategy excerpt and notes omitted fields.

## Review Notes
The CLI commands and ConfigMap key format are consistent with the official Argo CD and Argo Rollouts documentation. Lua syntax was reviewed by inspection against Argo CD's documented health-check contract; no local Lua interpreter was available in the workspace.
