# Validation Summary: How to Configure Multi-Cluster Management in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD Application and AppProject CRDs
- Argo CD ApplicationSet cluster generator
- Kubernetes ServiceAccounts, Secrets, and RBAC
- AWS EKS IAM authentication
- Google Kubernetes Engine authentication
- Prometheus alerting
- argocd-agent

## Sources Consulted
- Argo CD Cluster Management: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- Argo CD Declarative Setup, cluster secrets and EKS examples: https://argo-cd.readthedocs.io/en/stable/operator-manual/declarative-setup/
- Argo CD CLI `argocd cluster add`: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_add/
- Argo CD CLI `argocd cluster list`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_list/
- Argo CD CLI `argocd cluster rotate-auth`: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_rotate-auth/
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/stable/operator-manual/applicationset/Generators-Cluster/
- Argo CD ApplicationSet Specification Reference: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/applicationset-specification/
- Argo CD Metrics: https://argo-cd.readthedocs.io/en/latest/operator-manual/metrics/
- Kubernetes ServiceAccount token Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes ServiceAccount configuration: https://kubernetes.io/docs/tasks/configure-pod-container/configure-service-account/
- argocd-agent documentation: https://argocd-agent.readthedocs.io/latest/user-guide/adding-agents/

## Issues Found
- The EKS authentication guidance said to patch `argocd-repo-server` with AWS role environment variables. Argo CD's EKS cluster authentication path needs AWS credentials where cluster API access is performed, notably the application controller, ApplicationSet controller, and API server. Updated the example to show IRSA-style service account annotation for those components.
- The first ApplicationSet example omitted `spec.template.spec.project`, which is required in generated Argo CD Applications. Added `project: default` and `targetRevision: HEAD` to make the example complete and consistent with official examples.
- The token rotation script used `argocd cluster list -o name`, but the supported output modes are `json`, `yaml`, `wide`, and `server`. Replaced the remove/add loop with `argocd cluster rotate-auth` over an explicit managed cluster list, matching the current CLI command reference.

## Review Notes
- The service account token Secret example is technically valid, but Kubernetes documents these as long-lived legacy credentials and recommends TokenRequest-based short-lived tokens where possible. Argo CD still documents long-lived token Secrets for cluster registration in relevant flows, so the post remains valid with that caveat.
- The ApplicationSet snippets use the default fasttemplate-style `{{name}}` and `{{server}}` syntax. Argo CD currently supports this, while Go templates use `{{.name}}` and `{{.server}}` when `goTemplate: true` is enabled.
