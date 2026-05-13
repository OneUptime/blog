# Validation Summary: Flagger vs Argo Rollouts: Progressive Delivery Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Flagger
- Argo Rollouts
- Kubernetes Deployments and CRDs
- Istio traffic routing
- Progressive delivery, canary deployments, blue-green deployments, and A/B-style validation
- Prometheus-based analysis
- Webhooks, AnalysisTemplates, and traffic router integrations

## Sources Consulted
- Flagger introduction and provider overview: https://docs.flagger.app/
- Flagger "How it works" documentation: https://docs.flagger.app/usage/how-it-works
- Flagger deployment strategies documentation: https://docs.flagger.app/main/usage/deployment-strategies
- Flagger webhooks documentation: https://docs.flagger.app/main/usage/webhooks
- Argo Rollouts canary documentation: https://argoproj.github.io/argo-rollouts/features/canary/
- Argo Rollouts specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts Istio traffic management documentation: https://argoproj.github.io/argo-rollouts/features/traffic-management/istio/
- Argo Rollouts traffic management overview: https://argoproj.github.io/argo-rollouts/features/traffic-management/
- Argo Rollouts dashboard documentation: https://argoproj.github.io/argo-rollouts/dashboard/

## Issues Found
- Corrected the Flagger workload description. Flagger creates a primary Deployment and uses the target Deployment as the canary during analysis; it does not create a separate `myapp-canary` Deployment.
- Corrected the Argo Rollouts manifest. `successfulRunHistoryLimit` and `unsuccessfulRunHistoryLimit` belong under top-level `spec.analysis`, not under `strategy.canary.analysis`.
- Corrected the Argo Rollouts Istio example to use one coherent host-level traffic splitting pattern. The previous snippet mixed `canaryService`/`stableService` with subset-level `destinationRule` fields.
- Clarified the Deployment migration language because Argo Rollouts uses a Rollout CRD but can reference a Deployment with `workloadRef` during migration.
- Updated the support matrix for current Flagger traffic routing providers, Argo Rollouts traffic routers, and analysis providers.
- Replaced the inaccurate "flagger CLI" manual promotion reference with confirmation webhooks and `spec.skipAnalysis`.
- Clarified that service mesh or ingress support is required for traffic-shifted canaries, not every possible progressive delivery mode.
- Replaced "zero manifest changes" with "minimal workload manifest changes" because Flagger adoption still requires adding a Canary resource.
- Reworded the Argo synthetic traffic recommendation to use an AnalysisTemplate with Job or Web providers instead of the non-standard "pre-analysis job" phrasing.
- Replaced "UI plugin" with "dedicated dashboard" to match the documented Argo Rollouts kubectl plugin dashboard.

## Review Notes
The examples are syntactically valid YAML. The Argo Rollouts Rollout snippet still assumes the required Service and Istio VirtualService objects exist outside the snippet, which is consistent with the post's comparison-focused scope.
