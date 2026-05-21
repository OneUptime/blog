# Validation Summary: How to Add a Remote Cluster to ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD CLI
- Kubernetes
- Kubernetes RBAC
- Kubernetes Secrets and ServiceAccounts
- Sealed Secrets / External Secrets Operator
- ApplicationSet cluster labels

## Sources Consulted
- Argo CD Cluster Management documentation: https://argo-cd.readthedocs.io/en/stable/operator-manual/cluster-management/
- Argo CD `argocd cluster add` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_add/
- Argo CD `argocd cluster set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_set/
- Argo CD declarative setup documentation for cluster Secrets: https://argo-cd.readthedocs.io/en/latest/operator-manual/declarative-setup/
- Argo CD security documentation for external cluster credentials: https://argo-cd.readthedocs.io/en/stable/operator-manual/security/
- Kubernetes ServiceAccount token administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Argo CD upstream install manifest: https://raw.githubusercontent.com/argoproj/argo-cd/stable/manifests/install.yaml

## Issues Found
- The custom service account example used `--in-cluster` while adding the `remote-staging` kubeconfig context. The official `argocd cluster add` reference defines `--in-cluster` as the option for when Argo CD resides inside that cluster and should use `kubernetes.default.svc`, so it is misleading for a normal remote-cluster registration. Removed `--in-cluster` from the example.
- The troubleshooting commands used `deploy/argocd-application-controller`. The upstream Argo CD install manifest defines `argocd-application-controller` as a StatefulSet, not a Deployment. Updated the commands to target `statefulset/argocd-application-controller`.

## Review Notes
- The declarative cluster Secret examples match the official Argo CD cluster Secret format, including `argocd.argoproj.io/secret-type: cluster`, `name`, `server`, and JSON `config` with `bearerToken` and `tlsClientConfig`.
- The Kubernetes 1.24+ long-lived ServiceAccount token Secret example is technically valid, but Kubernetes recommends TokenRequest-issued short-lived tokens where possible. Argo CD still documents long-lived cluster credentials for managed clusters.
