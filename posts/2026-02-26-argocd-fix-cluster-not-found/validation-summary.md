# Validation Summary: How to Fix 'cluster not found' Error in ArgoCD

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Argo CD Application and ApplicationSet resources
- Kubernetes Secrets
- Kubernetes ServiceAccounts and RBAC
- AWS EKS IAM authentication for Argo CD clusters

## Sources Consulted
- Argo CD Cluster Management: https://argo-cd.readthedocs.io/en/release-2.14/operator-manual/cluster-management/
- Argo CD Declarative Setup, cluster Secrets and EKS examples: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Application Specification Reference: https://argo-cd.readthedocs.io/en/latest/user-guide/application-specification/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/release-2.7/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd cluster set` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_cluster_set/
- Argo CD `argocd app set` command reference: https://argo-cd.readthedocs.io/en/release-3.2/user-guide/commands/argocd_app_set/
- Argo CD ApplicationSet Cluster Generator documentation: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/

## Issues Found
No technical issues found.

## Review Notes
The post is technically accurate for current Argo CD behavior. The examples use broad `cluster-admin` permissions because that is the default behavior of `argocd cluster add`; production setups may prefer narrower RBAC where practical. The manually created long-lived ServiceAccount token example is valid for Kubernetes 1.24+, but Kubernetes documentation recommends using time-bound TokenRequest tokens when suitable.
