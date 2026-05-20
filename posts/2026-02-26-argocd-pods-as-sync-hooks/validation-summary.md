# Validation Summary: How to Use Pods as Sync Hooks in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD sync hooks and hook deletion policies
- Kubernetes Pods and Jobs
- Kubernetes Pod lifecycle and restart policies
- Kubernetes CLI and Argo CD CLI commands
- Kubernetes security contexts and resource requests/limits

## Sources Consulted
- Argo CD Sync Phases and Waves documentation: https://argo-cd.readthedocs.io/en/latest/user-guide/sync-waves/
- Argo CD Resource Hooks documentation: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/resource_hooks/
- Argo CD `argocd app sync` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_sync/
- Argo CD Resource Health documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/health/
- Argo CD GitOps Engine Pod health implementation: https://raw.githubusercontent.com/argoproj/gitops-engine/master/pkg/health/health_pod.go
- Kubernetes Pod lifecycle documentation: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
- Kubernetes API reference for PodSpec `activeDeadlineSeconds`: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.36/#podspec-v1-core
- Kubernetes v1.24 API reference for PodSpec `activeDeadlineSeconds`: https://kubernetes.io/docs/reference/generated/kubernetes-api/v1.24/#podspec-v1-core
- Kubernetes Job documentation: https://kubernetes.io/docs/concepts/workloads/controllers/job/

## Issues Found
- The post said Pods do not have `activeDeadlineSeconds` and that Pod-level `activeDeadlineSeconds` was added in Kubernetes 1.28. This was incorrect; `activeDeadlineSeconds` is a PodSpec field and appears in older Kubernetes API references as well. Updated the timeout section and comparison table to describe Pod-level and script-level timeout options accurately.
- The Postgres and Redis examples used `curl` against raw service ports (`5432` and `6379`), which are not HTTP endpoints and would not work as written. Updated those examples to use TCP reachability checks with `nc` and switched the image to `busybox:1.36`.

## Review Notes
The article correctly describes that Argo CD hooks can be Pod resources, that named hooks should use `BeforeHookCreation` or `generateName` for repeated runs, and that Pods with `restartPolicy: Never` or `OnFailure` are treated as finite hook-like resources by Argo CD health logic. The examples use `latest` image tags in several places; pinning immutable image digests would be better for production GitOps workflows, but that is a reproducibility improvement rather than a technical correctness issue.
