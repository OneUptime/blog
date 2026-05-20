# Validation Summary: How to Implement Canary Deployments with ArgoCD and Argo Rollouts

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes Rollout custom resources
- Kubernetes Services and Ingress
- NGINX Ingress Controller
- Istio traffic routing
- AWS Load Balancer Controller / ALB
- Prometheus-based AnalysisTemplates
- kubectl Argo Rollouts plugin

## Sources Consulted
- Argo Rollouts installation documentation: https://argo-rollouts.readthedocs.io/en/stable/installation/
- Argo Rollouts basic canary getting started guide: https://argo-rollouts.readthedocs.io/en/latest/getting-started/
- Argo Rollouts Rollout specification: https://argo-rollouts.readthedocs.io/en/latest/features/specification/
- Argo Rollouts canary strategy documentation: https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts traffic management overview: https://argo-rollouts.readthedocs.io/en/latest/features/traffic-management/
- Argo Rollouts NGINX traffic management guide: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts NGINX getting started guide: https://argo-rollouts.readthedocs.io/en/stable/getting-started/nginx/
- Argo Rollouts analysis documentation: https://argo-rollouts.readthedocs.io/en/stable/features/analysis/
- Argo Rollouts Prometheus analysis documentation: https://argo-rollouts.readthedocs.io/en/release-1.8/analysis/prometheus/
- Argo Rollouts kubectl plugin command documentation: https://argo-rollouts.readthedocs.io/en/latest/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/
- Argo Rollouts abort command documentation: https://argo-rollouts.readthedocs.io/en/stable/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_abort/
- Argo Rollouts retry command documentation: https://argo-rollouts.readthedocs.io/en/latest/generated/kubectl-argo-rollouts/kubectl-argo-rollouts_retry/
- Argo Rollouts FAQ for Argo CD health integration: https://argo-rollouts.readthedocs.io/en/stable/FAQ/
- Argo CD Application specification reference: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/application-specification/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/auto_sync/

## Issues Found
- The traffic-management prerequisite listed "AWS ALB Ingress Controller." Updated it to "AWS Load Balancer Controller (ALB)" to use the current AWS controller naming while preserving the ALB context used by Argo Rollouts documentation.
- The analysis section said failed analysis automatically "rolls back" the canary. Updated this to the more precise Argo Rollouts behavior: the update is aborted, traffic falls back to the stable ReplicaSet, and the desired spec remains the newer version until Git is reverted or the rollout is retried.
- The monitoring command described `.status.currentStepIndex` as the canary weight. Changed the label to "Check the current step index" because the JSONPath returns the rollout step index, not the traffic weight.
- The Argo CD UI note said Rollouts show only as "Progressing" during canary rollout. Updated it to mention "Progressing" or "Suspended" because Argo CD health checks distinguish active rollout progress from paused rollout states.

## Review Notes
The Rollout, AnalysisTemplate, NGINX routing, Istio routing, Argo CD Application, and kubectl plugin examples match current documented APIs and command shapes. The Prometheus queries are illustrative and depend on application-specific metric names and labels being present.
