# Validation Summary: How to Configure RBAC for Cluster-Level Operations in ArgoCD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Argo CD
- Argo CD RBAC
- Argo CD AppProjects
- Kubernetes RBAC and cluster-scoped resources
- GitOps

## Sources Consulted
- Argo CD RBAC Configuration: https://argo-cd.readthedocs.io/en/stable/operator-manual/rbac/
- Argo CD Project Specification Reference: https://argo-cd.readthedocs.io/en/stable/operator-manual/project-specification/
- Argo CD Projects user guide: https://argo-cd.readthedocs.io/en/release-3.0/user-guide/projects/
- Argo CD `argocd admin settings rbac can` command reference: https://argo-cd.readthedocs.io/en/latest/user-guide/commands/argocd_admin_settings_rbac_can/
- Argo CD `argocd cluster` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster/
- Argo CD `argocd cluster set` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_set/
- Argo CD `argocd cluster rotate-auth` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_rotate-auth/
- Argo CD `argocd cluster get` command reference: https://argo-cd.readthedocs.io/en/stable/user-guide/commands/argocd_cluster_get/

## Issues Found
- The credential rotation example used `argocd cluster set ... --kubeconfig`, but current Argo CD documentation for `argocd cluster set` does not include a `--kubeconfig` option for replacing stored credentials. Changed the example to the documented `argocd cluster rotate-auth SERVER/NAME` command.
- The cluster health section said Argo CD tracks "resource usage" as part of cluster health. The official cluster command references document cluster information such as connectivity and Kubernetes version, but not resource usage in that context. Removed "resource usage" from the sentence.

## Review Notes
The RBAC resource names, actions, AppProject `clusterResourceWhitelist` usage, project destination examples, and `argocd admin settings rbac can` syntax align with the official Argo CD documentation reviewed. The post does not pin an Argo CD version, so it was checked against current stable/latest documentation.
