# Validation Summary: How to Set Up Progressive Delivery with Istio and Argo Rollouts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo Rollouts
- Istio VirtualService and DestinationRule
- Kubernetes Services and Rollout custom resources
- Argo Rollouts AnalysisTemplate with Prometheus
- Argo Rollouts kubectl plugin
- Argo CD health customization and resource actions
- GitHub Actions
- Flagger

## Sources Consulted
- Argo Rollouts installation documentation: https://argoproj.github.io/argo-rollouts/installation/
- Argo Rollouts Istio traffic management documentation: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/istio/
- Argo Rollouts traffic management overview, including managed routes and header routing: https://argoproj.github.io/argo-rollouts/features/traffic-management/
- Argo Rollouts analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts basic usage and CLI examples: https://argoproj.github.io/argo-rollouts/getting-started/
- Argo Rollouts status command reference: https://argo-rollouts.readthedocs.io/en/release-1.8/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_status/
- Argo Rollouts FAQ for Argo CD integration and rollback behavior: https://argoproj.github.io/argo-rollouts/FAQ/
- Argo CD resource health customization documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio VirtualService reference: https://istio.io/docs/reference/config/networking/virtual-service/

## Issues Found
- The kubectl plugin installation commands moved the binary into `/usr/local/bin` without `sudo`. Updated both the local installation and GitHub Actions examples to use `sudo mv`, matching the official Argo Rollouts installation guidance.
- The analysis explanation said `failureLimit: 3` meant 3 consecutive failed checks. Argo Rollouts treats `failureLimit` as the allowed number of failed measurements, not necessarily consecutive failures. Updated the wording to "3 failed checks."
- The Argo CD section described enabling an "extension" and used an outdated/customization style that did not match current Argo CD health customization guidance. Updated the wording and changed the ConfigMap key to `resource.customizations.health.argoproj.io_Rollout`.
- The header-based routing example placed `managedRoutes` under `trafficRouting.istio`. Argo Rollouts expects `managedRoutes` under `spec.strategy.canary.trafficRouting` as a sibling of the traffic router. Moved it to the correct level.

## Review Notes
The main Rollout, Service, VirtualService, DestinationRule, AnalysisTemplate, CLI, and manual promotion examples are otherwise consistent with current Argo Rollouts and Istio documentation. The DestinationRule section is optional for the host-level routing pattern shown, but it is technically valid when mesh mTLS policy requires it.
