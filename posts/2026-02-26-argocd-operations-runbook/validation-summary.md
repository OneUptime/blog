# Validation Summary: How to Create an ArgoCD Operations Runbook

## Status
validated

## Post Type
Guide

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- kubectl
- Prometheus Operator PrometheusRule
- Prometheus metrics and PromQL

## Sources Consulted
- Argo CD installation documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/installation/
- Argo CD stable install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml
- Argo CD HA install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/ha/install.yaml
- Argo CD metrics documentation: https://argo-cd.readthedocs.io/en/release-3.0/operator-manual/metrics/
- Argo CD `argocd admin settings validate` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_validate/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD `argocd app terminate-op` command reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/commands/argocd_app_terminate-op/
- Argo CD `argocd repo get` and `argocd repo add` command references: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_get/ and https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_repo_add/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl rollout` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_rollout/
- Prometheus Operator API reference for alert rule annotations: https://prometheus-operator.dev/docs/api-reference/api/
- Referenced OneUptime posts were opened to verify that the linked URLs resolve: https://oneuptime.com/blog/post/2026-02-26-argocd-runbook-sync-loop/view, https://oneuptime.com/blog/post/2026-02-26-argocd-runbook-controller-not-processing/view, and https://oneuptime.com/blog/post/2026-02-26-argocd-runbook-redis-memory-full/view

## Issues Found
- The post used `deployment/argocd-application-controller` for logs and rollout commands. Current official Argo CD install manifests define `argocd-application-controller` as a StatefulSet, so those commands would fail on standard installations. Changed the relevant `kubectl logs`, `kubectl rollout restart`, and `kubectl rollout status` examples to use `statefulset/argocd-application-controller`.
- The OOM remediation example used `kubectl edit deployment argocd-application-controller`. Changed it to `kubectl edit statefulset argocd-application-controller` to match the official workload kind.
- The settings validation command omitted `--load-cluster-settings`, which the Argo CD command reference uses when validating settings from the current Kubernetes cluster. Added `--load-cluster-settings`.
- The `ArgoCDSyncFailing` alert used `argocd_app_sync_total{phase="Failed"} > 0`, which would keep firing after any historical failure because the metric is a counter. Changed it to `increase(argocd_app_sync_total{phase="Failed"}[15m]) > 0` so it detects failures during the alert window.

## Review Notes
The examples assume the default non-HA Argo CD component names. HA installations use different Redis resources, such as `argocd-redis-ha-haproxy`, so production runbooks should adapt Redis checks to the actual installation mode.
