# Validation Summary: How to Set Up Least Privilege Access in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher Manager
- Kubernetes RBAC
- `kubectl`
- `jq`
- YAML configuration for Rancher RBAC resources

## Sources Consulted
- Rancher Global Permissions: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/global-permissions
- Rancher Cluster and Project Roles: https://ranchermanager.docs.rancher.com/v2.13/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher Users workflow: https://ranchermanager.docs.rancher.com/api/workflows/users
- Rancher Access a Cluster with kubectl and kubeconfig: https://ranchermanager.docs.rancher.com/v2.12/how-to-guides/new-user-guides/manage-clusters/access-clusters/use-kubectl-and-kubeconfig
- Rancher Enabling User Retention: https://ranchermanager.docs.rancher.com/how-to-guides/advanced-user-guides/enable-user-retention
- Rancher Communicating with Downstream User Clusters: https://ranchermanager.docs.rancher.com/v2.11/reference-guides/rancher-manager-architecture/communicating-with-downstream-user-clusters
- Rancher source for `UserAttribute.LastLogin`: https://github.com/rancher/rancher
- Kubernetes `kubectl auth can-i`: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i
- Kubernetes Secrets: https://kubernetes.io/docs/concepts/configuration/secret/
- Kubernetes Secret good practices: https://kubernetes.io/docs/concepts/security/secrets-good-practices/
- Kubernetes RBAC good practices: https://kubernetes.io/docs/concepts/security/rbac-good-practices/

## Issues Found
- The post used `spec:` for `GlobalRole` and `RoleTemplate` manifests. Rancher `management.cattle.io/v3` RBAC resources expose fields such as `newUserDefault`, `context`, `displayName`, and `rules` at the top level, so those manifests were corrected.
- The audit commands used `.roleTemplateId`, but Rancher binding resources use `roleTemplateName`. The `kubectl` and `jq` examples were updated accordingly.
- The UI path for editing default global permissions was outdated. It was corrected to the current `Users & Authentication > Role Templates` flow and `Edit Config` action.
- The section that referenced `cluster-default-role` and `project-default-role` settings was inaccurate. It was replaced with Rancher’s documented cluster/project creator default role behavior.
- The `developer-no-secrets` role name and explanation overstated what RBAC can enforce. The example was renamed to emphasize direct Secret API access only, and the explanation now notes that Kubernetes workload creation can still expose Secrets in the namespace.
- The validation examples used `kubectl auth can-i --as=...`, which does not reflect Rancher’s normal per-user kubeconfig flow. They were updated to use kubeconfigs issued for test users in each role tier.
- The monthly review script tried to read a `LastLogin` condition from the `User` resource. It was corrected to read last-login data from `UserAttribute`, which Rancher documents for retention and inactivity tracking.

## Review Notes
- The post is technically relevant and salvageable after correction.
- The corrected examples align with Rancher’s current `management.cattle.io/v3` RBAC documentation and Kubernetes’ current RBAC and Secret-handling guidance.
