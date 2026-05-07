# Validation Summary: How to Configure Role-Based Access for CI/CD Pipelines in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes
- Kubernetes RBAC
- ServiceAccounts
- `kubectl`
- Rancher Kubernetes API (RK-API)

## Sources Consulted
- Kubernetes RBAC Authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- `kubectl create token`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Rancher API Keys: https://ranchermanager.docs.rancher.com/v2.13/reference-guides/user-settings/api-keys
- Rancher RK-API Quick Start Guide: https://ranchermanager.docs.rancher.com/api/quickstart
- Rancher Kubeconfigs workflow: https://documentation.suse.com/cloudnative/rancher-manager/latest/en/api/workflows/kubeconfigs.html
- Rancher Cluster and Project Roles: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher API Reference (`RoleTemplate`): https://ranchermanager.docs.rancher.com/v2.10/api/api-reference
- Previous v3 Rancher API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide

## Issues Found
- Step 6 incorrectly used a cluster-scoped API key against Rancher's own `/v3` API and relied on a kubeconfig generation flow that is not the current documented approach. I replaced it with Rancher's documented RK-API plus `ext.cattle.io/v1` `Kubeconfig` workflow, and clarified that scoped API keys are for the downstream cluster Kubernetes API rather than Rancher's API.
- Step 6 implied the Rancher API alternative applied to all supported versions in the post. I updated that section to call out the `Rancher v2.8+` requirement because RK-API was introduced in Rancher v2.8.
- Step 8 used an invalid `RoleTemplate` manifest shape by nesting `context`, `displayName`, and `rules` under `spec`. I moved those fields to the top level to match Rancher's `management.cattle.io/v3` schema.
- Step 8 described integrating a Kubernetes service account with Rancher project RBAC, but Rancher project membership is assigned to Rancher users. I updated the text to refer to a dedicated Rancher user for the CI/CD system.
- Step 8 only granted read access to `services` and `configmaps`, which would not support the deployment workflow described elsewhere in the post. I updated the verbs to allow create, update, and patch for those resources.

## Review Notes
- The Kubernetes ServiceAccount, Role, RoleBinding, ClusterRole, and `kubectl auth can-i` examples are consistent with current Kubernetes RBAC behavior.
- The ServiceAccount token example in Step 5 correctly uses the TokenRequest flow via `kubectl create token`; the API server may return a token lifetime shorter or longer than the requested duration.
- Rancher environments using a private or self-signed CA may require adding CA data to the temporary Rancher API kubeconfig used in Step 6, as described in Rancher's RK-API quickstart.
- Rancher v2.14 is phasing out legacy v3 token workflows. The updated Step 6 now uses Rancher's current RK-API-based kubeconfig workflow instead of relying on the legacy `/v3` pattern.
