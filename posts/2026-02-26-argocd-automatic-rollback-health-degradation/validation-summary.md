# Validation Summary: How to Implement Automatic Rollback on Health Degradation

## Status
validated

## Post Type
Technical tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes Jobs and custom resources
- Prometheus and PromQL
- Prometheus Operator PrometheusRule
- Alertmanager
- Python Flask webhook controller
- Git-based rollback workflows

## Sources Consulted
- Argo Rollouts Canary documentation: https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts Analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts Rollback Window documentation: https://argo-rollouts.readthedocs.io/en/stable/features/rollback/
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD rollback command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_rollback/
- Argo CD automated sync documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-2.8/operator-manual/metrics/
- Argo CD API documentation: https://argo-cd.readthedocs.io/en/latest/developer-guide/api-docs/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Operator API documentation: https://github.com/prometheus-operator/prometheus-operator
- Argo Helm chart listing for argo-rollouts 2.37.x: https://artifacthub.io/packages/helm/argo/argo-rollouts/2.37.8

## Issues Found
- The Rollout example placed `rollbackWindow` under `spec.strategy.canary`, but Argo Rollouts documents it as a top-level `spec.rollbackWindow` field. Moved it to the correct location.
- The text said failed analysis "reverts to the previous stable version." Argo Rollouts aborts the rollout and shifts traffic back to the stable ReplicaSet; updated the wording to match documented behavior.
- The PostSync rollback example used `{"id": 0}` while describing it as the previous version. Argo CD rollback IDs are history IDs, and `0` is not necessarily the previous deployment. Updated the script to read the previous history entry and use that ID.
- The Argo CD rollback API examples implied they work with automated sync. Argo CD documentation states rollback cannot be performed while automated sync is enabled. Added caveats to the PostSync, Alertmanager controller, and conclusion text.
- The Prometheus alert expression used `and` between vectors with incompatible label sets, which would not match as intended. Updated it to use `and on()` with an aggregate deployment-change gate.
- The Alertmanager route used legacy `match` syntax. Updated it to current `matchers` syntax.
- The Python rollback controller referenced `os.environ` without importing `os`. Added the missing import.
- The rollback monitoring example used `argocd_app_rollback_total`, which is not listed in the official Argo CD metrics. Replaced it with a custom `rollback_controller_rollback_total` metric name appropriate for the custom rollback controller pattern.

## Review Notes
- The examples are illustrative and assume the custom images contain required tools such as `curl`, `jq`, and `bc`.
- The Python sample uses `verify=False` for in-cluster HTTPS calls. This may work in constrained examples, but production code should configure trusted CA verification instead.
