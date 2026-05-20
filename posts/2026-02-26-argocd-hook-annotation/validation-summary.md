# Validation Summary: How to Use the argocd.argoproj.io/hook Annotation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync hooks and sync waves
- Kubernetes Jobs and Pods
- Kubernetes resource health
- kubectl and argocd CLI commands
- Shell scripting with jq and awk

## Sources Consulted
- Argo CD Sync Phases and Waves: https://argo-cd.readthedocs.io/en/stable/user-guide/sync-waves/
- Argo CD Resource Health: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD `argocd app get` Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_app_get/
- Argo CD Job health implementation: https://raw.githubusercontent.com/argoproj/argo-cd/master/gitops-engine/pkg/health/health_job.go
- Argo CD Pod health implementation: https://raw.githubusercontent.com/argoproj/argo-cd/master/gitops-engine/pkg/health/health_pod.go
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/
- Kubernetes `kubectl logs` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_logs/
- Kubernetes `kubectl top node` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_top/kubectl_top_node/

## Issues Found
- Argo CD now documents seven hook types, including deletion hooks. Updated the hook phase list and summary to include `PreDelete` and `PostDelete`.
- The pre-deployment CPU check summed node CPU percentages, which can incorrectly exceed 90 on multi-node clusters. Changed it to average the CPU percentage across nodes.
- The Job health description used `.status.succeeded` and `.status.failed > backoffLimit` directly. Updated it to match Argo CD's health assessment, which uses Kubernetes Job `Complete` and `Failed` conditions.
- The lingering hook debug command used a label selector for `argocd.argoproj.io/hook`, but hooks use annotations. Replaced it with a JSON query that selects Jobs by the hook annotation.

## Review Notes
Some manifests are intentionally illustrative and use placeholder images, service names, and webhook URLs. The examples assume the hook Pods have the required RBAC permissions and that cluster dependencies such as Metrics Server, jq, curl, and pg_isready are available where used.
