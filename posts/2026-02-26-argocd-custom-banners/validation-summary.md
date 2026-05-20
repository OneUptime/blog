# Validation Summary: How to Add Custom Banners to ArgoCD UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD UI configuration
- Argo CD `argocd-cm` ConfigMap
- Kubernetes ConfigMaps, CronJobs, RBAC, and `kubectl patch`
- Argo CD Helm chart values
- CSS customization

## Sources Consulted
- Argo CD Custom Styles and Banners documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/custom-styles/
- Argo CD `argocd-cm.yaml` example: https://argo-cd.readthedocs.io/en/latest/operator-manual/argocd-cm-yaml/
- Argo CD Helm chart `values.yaml`: https://github.com/argoproj/argo-helm/blob/main/charts/argo-cd/values.yaml
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes `kubectl patch` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- `ui.bannerposition` was documented as accepting only `top` or `bottom`. Argo CD also supports `both`, so the comment and options table were updated.
- The maintenance CronJob schedules were described as UTC, but Kubernetes interprets CronJob schedules in the kube-controller-manager local timezone unless `.spec.timeZone` is set. Added `timeZone: "Etc/UTC"` to both CronJob examples.
- The Helm values example used `server.config`, which is not the official Argo CD Helm chart path for `argocd-cm` entries. Updated it to `configs.cm`, matching the official chart.

## Review Notes
- The JSON patch examples use valid `kubectl patch --type json` syntax. They assume the target keys exist when using `remove`, which is appropriate for the shown workflow but may fail if run repeatedly after the keys have already been removed.
