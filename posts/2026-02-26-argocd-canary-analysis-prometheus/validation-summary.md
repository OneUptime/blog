# Validation Summary: How to Handle Canary Analysis with ArgoCD and Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo Rollouts
- Kubernetes Rollout, Service, and Ingress resources
- NGINX Ingress traffic splitting
- Prometheus and PromQL
- Argo Rollouts notifications

## Sources Consulted
- Argo Rollouts Canary Deployment Strategy: https://argo-rollouts.readthedocs.io/en/stable/features/canary/
- Argo Rollouts NGINX traffic management: https://argo-rollouts.readthedocs.io/en/stable/features/traffic-management/nginx/
- Argo Rollouts Analysis and Prometheus provider documentation: https://argoproj.github.io/argo-rollouts/features/analysis/
- Argo Rollouts Controller Metrics: https://argoproj.github.io/argo-rollouts/features/controller-metrics/
- Argo Rollouts metrics package reference: https://pkg.go.dev/github.com/argoproj/argo-rollouts@v1.9.0/controller/metrics
- Argo Rollouts Notifications overview: https://argo-rollouts.readthedocs.io/en/stable/features/notifications/
- Argo CD sync options and RespectIgnoreDifferences: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-options/
- Argo CD diff customization: https://argo-cd.readthedocs.io/en/release-3.4/user-guide/diffing/
- Argo Helm chart values for argo-rollouts: https://raw.githubusercontent.com/argoproj/argo-helm/main/charts/argo-rollouts/values.yaml

## Issues Found
- The NGINX Ingress example incorrectly put `nginx.ingress.kubernetes.io/canary` annotations on the stable Ingress. Argo Rollouts expects `stableIngress` to reference the primary stable Ingress and creates/updates a separate canary Ingress. Removed the canary annotations from the stable Ingress example.
- The explanation of `failureCondition` and `failureLimit` implied an immediate rollback and consecutive failures. Argo Rollouts counts failed measurements and fails the AnalysisRun when the configured failure limit is reached. Updated the wording and changed the error-rate example to `failureLimit: 1` to match the intended immediate-fail behavior.
- The Argo CD `ignoreDifferences` example ignored Rollout `steps` and `/status`, which would hide legitimate Git changes to rollout steps and is unnecessary for normal status handling. Replaced it with ignores for the Argo Rollouts-managed `rollouts-pod-template-hash` selector on the stable and canary Services.
- The monitoring examples used non-documented metric names such as `argo_rollouts_info` and `argo_rollouts_analysis_run_info`. Updated them to the documented Argo Rollouts controller metrics: `rollout_info`, `analysis_run_info`, and `rollout_info_replicas_available`.
- The failure-handling section said Argo Rollouts automatically rolls back. Updated it to the more precise behavior: an unsuccessful analysis aborts the rollout and shifts traffic back to the stable ReplicaSet.

## Review Notes
- The Prometheus metric names in application queries, such as `http_requests_total`, are app-specific placeholders and are technically plausible if the application exports those labels.
- The Helm chart version in the example is pinned to a valid historical chart version, but the current upstream chart is newer. Keeping a pinned version is acceptable for a tutorial, though future maintenance should periodically refresh it.
