# Validation Summary: How to Implement Continuous Verification with ArgoCD

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes
- Prometheus and PromQL
- Grafana
- Argo CD Notifications
- Webhook-based verification
- OneUptime

## Sources Consulted
- Argo Rollouts Analysis documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts Canary documentation: https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts Rollout specification: https://argoproj.github.io/argo-rollouts/features/specification/
- Argo Rollouts Web metrics provider documentation: https://argoproj.github.io/argo-rollouts/analysis/web/
- Argo Rollouts Controller Metrics documentation: https://argoproj.github.io/argo-rollouts/features/controller-metrics/
- Argo CD Notifications webhook documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/notifications/services/webhook/
- Argo CD Metrics documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/metrics/
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus querying basics documentation: https://prometheus.io/docs/prometheus/latest/querying/basics/

## Issues Found
- The Rollout example used `valueFromPodTemplateHash: true`, which is not a valid Argo Rollouts analysis argument field. Changed it to `valueFrom.podTemplateHashValue: Latest`, matching the documented Rollout specification for passing the latest ReplicaSet pod template hash into an AnalysisRun.
- The post-deployment verification description implied that monitoring alone can trigger rollback. A standalone post-deployment AnalysisRun reports success or failure but does not automatically rollback an application by itself. Updated the wording to say it can alert or trigger rollback automation.
- The webhook AnalysisTemplate referenced `{{args.service-name}}` and `{{args.api-token}}` without declaring those arguments. Added the missing `args` entries.
- The webhook POST example sends a JSON body but did not set `Content-Type: application/json`. Added the header to match Argo Rollouts web metric provider guidance.
- The Grafana verification pass-rate query divided raw `argocd_app_info` vectors directly. Changed it to divide aggregated counts with `sum(...) / sum(...)`.
- The dashboard used `increase()` over `analysis_run_metric_phase`, which is documented as an Argo Rollouts metric but is not a counter-style failure total. Replaced it with a current failure ratio using `analysis_run_phase`.
- The maturity model said baseline comparison with auto-rollback. Changed it to rollback automation to avoid implying standalone post-deploy AnalysisRuns automatically rollback completed deployments.

## Review Notes
The resource YAML snippets were checked for YAML syntax after the fixes. The Prometheus examples assume the application metrics include the shown labels, such as `service` and `rollouts_pod_template_hash`; in a real cluster, those labels must be added by instrumentation or Prometheus relabeling.
