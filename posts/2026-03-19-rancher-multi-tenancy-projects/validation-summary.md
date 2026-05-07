# Validation Summary: How to Use Projects for Multi-Tenancy in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Rancher Projects
- Kubernetes Namespaces
- Kubernetes RBAC
- Kubernetes NetworkPolicy
- Terraform Rancher2 provider
- Bash

## Sources Consulted
- Rancher API workflow for Projects: https://ranchermanager.docs.rancher.com/v2.11/api/workflows/projects
- Rancher docs on project resource quotas: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/manage-projects/manage-project-resource-quotas/about-project-resource-quotas
- Rancher docs on cluster and project roles: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher docs on projects and namespaces: https://ranchermanager.docs.rancher.com/v2.8/how-to-guides/new-user-guides/manage-clusters/projects-and-namespaces
- Rancher docs on imported cluster registration and Project Network Isolation: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/kubernetes-clusters-in-rancher-setup/register-existing-clusters
- Rancher cluster configuration reference for K3s: https://ranchermanager.docs.rancher.com/reference-guides/cluster-configuration/rancher-server-configuration/k3s-cluster-configuration
- Rancher cluster configuration reference for RKE2: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/cluster-configuration/rancher-server-configuration/rke2-cluster-configuration
- Terraform provider docs for `rancher2_project_role_template_binding`: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/resources/project_role_template_binding.md
- Terraform provider docs for `rancher2_principal`: https://raw.githubusercontent.com/rancher/terraform-provider-rancher2/master/docs/data-sources/principal.md
- Kubernetes docs for NetworkPolicy: https://kubernetes.io/docs/concepts/services-networking/network-policies/

## Issues Found
- The project-creation scripts used `kubectl apply` with `metadata.generateName`. Rancher’s project API workflow requires `kubectl create` for this pattern, so the commands were changed accordingly.
- The quota examples included `usedLimit` in the project spec. Rancher’s creation examples use only `limit`, so the unnecessary `usedLimit` field was removed from the manifests.
- The original Step 4 command patched `enableProjectMonitoring`, which is unrelated to tenant isolation. This was replaced with the correct explanation that Project Network Isolation is a cluster-level Rancher setting.
- The original NetworkPolicy example matched `field.cattle.io/projectId` against display-style placeholder values such as `p-alpha`, which is not how project membership is represented in practice. The example was rewritten to use valid namespace label selectors and the standard `kubernetes.io/metadata.name` namespace label for shared services and DNS targeting.
- The onboarding script mixed Rancher management-cluster resources (`Project`) and downstream-cluster resources (`Namespace`, `NetworkPolicy`, `LimitRange`) in a single implicit `kubectl` context. The script was corrected to use separate management and downstream contexts.
- The onboarding script added a `field.cattle.io/projectId` namespace label even though Rancher documents the namespace association via annotation. The unnecessary label was removed.
- The Terraform RBAC example referenced group principals without noting that `rancher2_principal` defaults to `user`. A clarification comment was added so surrounding data-source definitions use `type = "group"` when appropriate.

## Review Notes
- The DNS allow rule assumes the cluster DNS pods are labeled `k8s-app: kube-dns`, which is common on Rancher-managed clusters but may need adjustment if a cluster uses different DNS pod labels.
- The NetworkPolicy examples assume tenant namespaces are labeled with `tenant=<name>` and shared service namespaces keep the documented names `monitoring`, `logging`, and `ingress`.
