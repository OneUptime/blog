# Validation Summary: How to Manage ArgoCD Clusters Declaratively

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD declarative setup
- Argo CD cluster secrets
- Argo CD ApplicationSet cluster generator
- Kubernetes Secrets, ServiceAccounts, and RBAC
- AWS EKS IAM authentication
- Google GKE Workload Identity authentication
- External Secrets Operator
- Bitnami Sealed Secrets

## Sources Consulted
- Argo CD Declarative Setup: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD Cluster Management: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- Argo CD ApplicationSet Cluster Generator: https://argo-cd.readthedocs.io/en/latest/operator-manual/applicationset/Generators-Cluster/
- Argo CD `argocd cluster get` Command Reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_get/
- Argo CD `argocd cluster list` Command Reference: https://argo-cd.readthedocs.io/en/release-2.9/user-guide/commands/argocd_cluster_list/
- Kubernetes Managing Service Accounts: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes Labels, Annotations, and Taints Reference: https://kubernetes.io/docs/reference/labels-annotations-taints/
- External Secrets Operator Advanced Templating: https://external-secrets.io/v0.10.4/guides/templating/
- Bitnami Sealed Secrets documentation: https://github.com/bitnami-labs/sealed-secrets

## Issues Found
- The post said the in-cluster target is always available. Argo CD enables the local cluster by default, but it can be disabled through configuration, so this was changed to "By default."
- The EKS authentication note only mentioned controller pods. Argo CD's EKS guidance also accounts for `argocd-server`, so the text now says controller and server pods need AWS credentials.
- The ApplicationSet example omitted `template.metadata.name` and `spec.project`, which would make the generated Application incomplete. Added both fields.
- The verification snippet labeled a Kubernetes Secret listing as a connectivity test and printed `.data.server` in base64 form. Updated the comment and command to inspect decoded cluster secret server URLs instead.

## Review Notes
The service account token Secret example is technically valid, but Kubernetes documentation recommends short-lived TokenRequest tokens where suitable and warns about long-lived bearer token risk. The post already warns not to commit cluster credentials in plain text.
