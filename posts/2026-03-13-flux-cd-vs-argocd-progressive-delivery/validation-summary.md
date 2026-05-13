# Validation Summary: Flux CD vs ArgoCD: Which Is Better for Progressive Delivery

## Status
validated

## Post Type
Technical comparison / guide

## Technologies Covered
- Flux CD
- Argo CD
- Flagger
- Argo Rollouts
- Kubernetes
- HelmRelease
- Istio
- Linkerd / SMI
- NGINX Ingress
- Prometheus
- Datadog
- AWS CloudWatch
- New Relic
- Graphite
- GitOps

## Sources Consulted
- Flagger introduction and GitOps compatibility: https://docs.flagger.app/main
- Flagger installation with Helm and install values: https://docs.flagger.app/main/install/flagger-install-on-kubernetes
- Flagger metrics analysis documentation: https://docs.flagger.app/main/usage/metrics
- Flagger webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Flagger deployment strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger Helm chart listing: https://artifacthub.io/packages/helm/flagger/flagger
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts Rollout specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts Istio traffic management documentation: https://argoproj.github.io/argo-rollouts/features/traffic-management/istio/
- Argo Rollouts traffic management overview: https://argoproj.github.io/argo-rollouts/features/traffic-management/
- Argo Rollouts promote command reference: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_promote/
- Argo Rollouts FAQ for Argo CD resource actions: https://argoproj.github.io/argo-rollouts/FAQ/
- Argo CD resource actions documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/resource_actions/
- Argo CD app actions run command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_actions_run/
- Argo CD UI extensions documentation: https://argo-cd.readthedocs.io/en/release-3.4/developer-guide/extensions/ui-extensions/

## Issues Found
- The Flagger HelmRelease pinned `version: "1.37.x"`, while the current Flagger chart is 1.43.x. Updated the example to `version: "1.43.x"`.
- The Argo Rollouts example placed `successfulRunHistoryLimit` and `unsuccessfulRunHistoryLimit` under `strategy.canary.analysis`, but the Rollout spec defines these under top-level `spec.analysis`. Moved the history limits to `spec.analysis`.
- The Argo Rollouts Istio example mixed host-level fields (`canaryService` and `stableService`) with subset-level `destinationRule` routing. Removed the service fields so the snippet consistently uses the documented subset-level Istio pattern.
- The inline AnalysisTemplate argument referenced `myapp-canary`, which no longer matches the subset-level Istio pattern. Updated it to `myapp`.
- The Argo CD resource action command omitted the `argoproj.io` API group, which is needed to disambiguate Rollout resource actions in typical CLI usage. Added `--group argoproj.io`.
- The comment above the Argo CD action described it as an Argo CD UI plugin action, but the example is a CLI resource action. Updated the comment to describe the command accurately.
- The metrics provider row read as an exhaustive list while both projects support additional providers. Renamed it to "Example metrics providers" to keep the comparison accurate without expanding the table.

## Review Notes
The examples remain partial snippets: they assume the referenced HelmRepository, Services, Istio VirtualService, DestinationRule, and AnalysisTemplate already exist. That is acceptable for a comparison post, but a full tutorial would need to include those supporting resources. The Flagger and Argo Rollouts examples align with current documented APIs and commands as of 2026-05-13.
