# Validation Summary: How to Implement Blue-Green Deployments with ArgoCD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes Rollout custom resources
- Kubernetes Services
- Argo CD Application resources
- Argo Rollouts kubectl plugin
- Prometheus-based AnalysisTemplates

## Sources Consulted
- Argo Rollouts BlueGreen documentation: https://argoproj.github.io/argo-rollouts/features/bluegreen/
- Argo Rollouts Rollout specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts Analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts kubectl plugin documentation: https://argoproj.github.io/argo-rollouts/features/kubectl-plugin/
- Argo Rollouts generated kubectl command reference: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/
- Argo Rollouts installation documentation: https://argoproj.github.io/argo-rollouts/installation/
- Argo Rollouts FAQ on Argo CD integration and rollback behavior: https://argoproj.github.io/argo-rollouts/FAQ/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/

## Issues Found
- The rollout event sequence said Argo Rollouts waits for new pods to become ready before pointing the preview Service to the new ReplicaSet. Official BlueGreen documentation says the controller first modifies the preview Service to point to the new ReplicaSet, then scales the new ReplicaSet and waits for it to become available. Updated the sequence to match the documented order.
- The Argo CD health-check section claimed Argo CD 2.0+ includes Rollout health checks by default. Current official documentation confirms Rollout health integration through Argo CD Lua health checks, but does not support that exact version-specific claim in the stable Resource Health page. Reworded it to tell readers to verify bundled support or configure the health check in `argocd-cm`.

## Review Notes
The Rollout, Service, Argo CD Application, kubectl plugin commands, install command, and pre-promotion AnalysisTemplate examples are consistent with current official documentation. Rollback behavior remains version- and timing-sensitive: a fast blue-green rollback depends on the old ReplicaSet still being retained during `scaleDownDelaySeconds`; after it has been scaled down, reverting through Git triggers a normal rollout path.
