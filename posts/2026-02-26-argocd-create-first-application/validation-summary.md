# Validation Summary: How to Create Your First ArgoCD Application

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Argo CD
- GitOps
- Kubernetes
- Kubernetes Deployments and Services
- Argo CD CLI
- kubectl

## Sources Consulted
- Argo CD Getting Started: https://github.com/argoproj/argo-cd/blob/master/docs/getting_started.md
- Argo CD `argocd app create` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_create/
- Argo CD `argocd app get` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_get/
- Argo CD `argocd app wait` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_wait/
- Argo CD automated sync policy documentation: https://argo-cd.readthedocs.io/en/stable/user-guide/auto_sync/
- Argo CD application specification reference: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/application-specification/
- Argo CD `argocd app delete` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_app_delete/
- Argo CD `argocd repo add` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_repo_add/
- Argo CD `argocd login` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_login/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes Service documentation: https://kubernetes.io/docs/concepts/services-networking/service/
- Kubernetes `kubectl create namespace` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_namespace/

## Issues Found
- The sync section described `argocd app get nginx-demo --refresh` as watching sync progress. The command refreshes and retrieves application details once; it does not wait for the operation to complete. Changed it to `argocd app wait nginx-demo`, which is the Argo CD CLI command for waiting until an application reaches a synced and healthy state.

## Review Notes
The Kubernetes Deployment and Service manifests use current stable APIs and valid selectors. The Argo CD create, login, repo credentials, auto-sync, namespace creation, and delete commands match current official command references. The internal OneUptime next-step links returned HTTP 200 during validation.
