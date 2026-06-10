# Validation Summary: How to Implement ArgoCD Rollouts

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo Rollouts (Kubernetes controller)
- Kubernetes (Deployments, Services, Ingress, PodDisruptionBudget)
- Helm
- kubectl + kubectl argo rollouts plugin
- NGINX Ingress
- Istio (VirtualService)
- AWS Application Load Balancer
- Prometheus (for analysis metrics)

## Sources Consulted
- Argo Rollouts official documentation: https://argoproj.github.io/argo-rollouts/
- Blue-green strategy spec: https://argoproj.github.io/argo-rollouts/features/bluegreen/
- Canary strategy spec: https://argoproj.github.io/argo-rollouts/features/canary/
- Analysis & web metric provider: https://argoproj.github.io/argo-rollouts/features/analysis/ and the source at https://github.com/argoproj/argo-rollouts/blob/master/metricproviders/webmetric/webmetric.go
- NGINX traffic routing: https://argoproj.github.io/argo-rollouts/features/traffic-management/nginx/
- Istio traffic routing: https://argoproj.github.io/argo-rollouts/features/traffic-management/istio/
- ALB traffic routing: https://argoproj.github.io/argo-rollouts/features/traffic-management/alb/
- Dashboard: https://argoproj.github.io/argo-rollouts/dashboard/
- Helm chart values: https://github.com/argoproj/argo-helm/blob/main/charts/argo-rollouts/values.yaml
- kubectl plugin reference: https://argoproj.github.io/argo-rollouts/generated/kubectl-argo-rollouts/kubectl-argo-rollouts/

## Issues Found

1. **Web analysis smoke test used an invalid condition expression.** The original `successCondition: result.statusCode == 200` does not work — the Argo Rollouts web provider exposes only `result` (the value extracted by `jsonPath` from the response body), not an HTTP `statusCode`. The HTTP 2xx check is already enforced internally by the provider before the condition is evaluated. Rewrote the example to use `jsonPath: "{$.status}"` and `successCondition: result == "ok"`, which matches the documented pattern, and updated the inline comment.

2. **Blue-green `autoPromotionSeconds` was inert as configured.** The original example set `autoPromotionEnabled: true` alongside `autoPromotionSeconds: 300`. Per the official docs, `autoPromotionSeconds` is ignored when `autoPromotionEnabled` is true — promotion happens immediately once the new ReplicaSet is healthy, so the 300-second wait would never apply. Changed `autoPromotionEnabled: false` and updated the comments to accurately describe the resulting "promote after N seconds" behavior.

3. **Dashboard section conflated two different mechanisms.** The original described `kubectl argo rollouts dashboard` as "port-forwarding" the dashboard. That command actually runs a local UI server on the user's machine that talks to the cluster via kubeconfig — it is not a port-forward to an in-cluster pod. Also removed the unused `-n argo-rollouts` flag (the dashboard subcommand has no notion of a namespace) and reworded the preamble to distinguish the local dashboard from the optional in-cluster dashboard installed via Helm.

## Review Notes

- The blog title says "ArgoCD Rollouts", but the correct project name is **Argo Rollouts** — it is a standalone controller under the Argo project umbrella and does not require Argo CD. The body of the post uses "Argo Rollouts" correctly throughout; only the title and tags use the incorrect name. Left as-is to avoid restructuring (this affects Blogs.json and post slug) but worth correcting in a future pass.
- The NGINX `Ingress` example uses the legacy `kubernetes.io/ingress.class: nginx` annotation. This is deprecated since Kubernetes 1.18 in favor of the `ingressClassName` spec field, but still works on modern NGINX Ingress installs. Not changed because it remains functional.
- The Istio `VirtualService` example uses `networking.istio.io/v1beta1`. The current stable Istio API is `networking.istio.io/v1`, but `v1beta1` is still served by Istio for backward compatibility.
- The PDB example uses `policy/v1`, which is correct for Kubernetes 1.21+.
- `revisionHistoryLimit` appears at the Rollout spec level — correct (matches Deployment semantics).
- All kubectl plugin commands shown (`get`, `promote`, `promote --full`, `abort`, `retry rollout`, `undo`, `pause`, `resume`, `history`) are valid against the current plugin.
- Helm values `controller.replicas` and `dashboard.enabled` were verified against the upstream `argo-rollouts` chart values.
