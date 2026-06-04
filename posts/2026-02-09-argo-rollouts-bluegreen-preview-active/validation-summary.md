# Validation Summary: How to Use Argo Rollouts BlueGreen Strategy with Preview and Active Services

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes
- Argo Rollouts
- Argo Rollouts BlueGreen strategy
- Argo Rollouts kubectl plugin
- Argo Rollouts AnalysisTemplates
- Prometheus
- Kubernetes Ingress
- Istio traffic routing
- Argo Rollouts notifications

## Sources Consulted
- Argo Rollouts BlueGreen documentation: https://argoproj.github.io/argo-rollouts/features/bluegreen/
- Argo Rollouts Rollout specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts Analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts kubectl plugin documentation: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/
- Argo Rollouts controller metrics documentation: https://argoproj.github.io/argo-rollouts/features/controller-metrics/
- Argo Rollouts anti-affinity documentation: https://argoproj.github.io/argo-rollouts/features/anti-affinity/anti-affinity/
- Argo Rollouts notifications documentation: https://argo-rollouts.readthedocs.io/en/release-1.8/features/notifications/

## Issues Found
- Corrected the basic BlueGreen example comment for `autoPromotionEnabled: false`; this setting pauses before promotion rather than auto-promoting after analysis.
- Corrected the sample rollout status replica counts so `Ready` and `Available` match the two running ReplicaSets during preview.
- Clarified that the short service DNS name `api-preview` is used from another pod in the same namespace.
- Corrected the manual promotion status comment to say the new version is stable and active, not that both versions are active.
- Corrected the description of `scaleDownDelaySeconds`; it delays scaling down the previous ReplicaSet after promotion, not the start of analysis.
- Corrected failed pre-promotion analysis behavior; the rollout aborts and keeps the active service on the stable version rather than switching and rolling back.
- Added the required caveat for `undo`: rollback is immediate only while the previous ReplicaSet is still scaled up during the scale-down delay.
- Corrected `scaleDownDelayRevisionLimit`; it limits old ReplicaSets kept scaled up during the delay, not replica count.
- Replaced a generic Kubernetes pod anti-affinity snippet with Argo Rollouts `blueGreen.antiAffinity`, matching the Rollout spec.
- Corrected Prometheus metric names to the current Argo Rollouts controller metrics (`rollout_info`, `rollout_info_replicas_available`, and `analysis_run_phase`).
- Replaced the invalid BlueGreen `trafficRouting` progressive exposure example with a canary strategy example, because Argo Rollouts traffic routing fields are part of canary traffic management rather than BlueGreen service switching.
- Added a Rollout notification subscription annotation, which Argo Rollouts notifications require for a Rollout to subscribe to a trigger and service.

## Review Notes
The post is technically relevant and has been corrected against current Argo Rollouts documentation. The examples remain illustrative; production deployments should pin controller and plugin release versions instead of relying on `latest` for reproducibility.
