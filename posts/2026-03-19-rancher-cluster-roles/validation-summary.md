# Validation Summary: How to Assign Cluster Roles in Rancher

## Status
validated

## Post Type
Guide

## Technologies Covered
- Rancher
- Rancher RBAC
- Kubernetes
- Kubernetes RBAC
- Rancher Kubernetes API (RK-API)
- Terraform
- `kubectl`
- `curl`
- `jq`

## Sources Consulted
- Rancher Adding Users to Clusters: https://ranchermanager.docs.rancher.com/how-to-guides/new-user-guides/manage-clusters/access-clusters/add-users-to-clusters
- Rancher Cluster and Project Roles: https://ranchermanager.docs.rancher.com/v2.10/how-to-guides/new-user-guides/authentication-permissions-and-global-configuration/manage-role-based-access-control-rbac/cluster-and-project-roles
- Rancher API Keys: https://ranchermanager.docs.rancher.com/reference-guides/user-settings/api-keys
- Rancher API Reference: https://ranchermanager.docs.rancher.com/v2.12/api/api-reference
- Rancher v3 API Guide: https://ranchermanager.docs.rancher.com/v2.14/api/v3-rancher-api-guide
- Rancher `ClusterRoleTemplateBinding` type definition: https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/authz_types.go
- Rancher `Cluster` type definition: https://github.com/rancher/rancher/blob/main/pkg/apis/management.cattle.io/v3/cluster_types.go
- Rancher Terraform provider `rancher2_cluster_role_template_binding` docs: https://github.com/rancher/terraform-provider-rancher2/blob/master/docs/resources/cluster_role_template_binding.md
- Kubernetes `kubectl auth can-i` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i
- Kubernetes Pod Security Admission: https://kubernetes.io/docs/concepts/security/pod-security-admission/

## Issues Found
- The post described `Read-Only` as a built-in cluster role. Rancher documents two primary cluster roles, `Owner` and `Member`, plus a set of built-in custom cluster roles. I corrected the role overview and the role-selection example to match the documented model.
- The UI navigation for editing cluster membership did not match the current Rancher workflow. I updated it to the documented path of `Cluster Management` -> `Edit Config` -> `Member Roles`.
- The post said users can be searched by email address when adding members. Rancher documents user search by username or display name, so I corrected that detail.
- The API example used the legacy `/v3/clusterroletemplatebindings` shape and old field names. I replaced it with the current RK-API example under `management.cattle.io/v3`, including the correct namespaced endpoint and fields such as `clusterName`, `roleTemplateName`, and `userPrincipalName`.
- The cluster-listing example used the old `/v3/clusters` response shape. I updated it to the RK-API list endpoint and the Kubernetes-style `.items[]` response format.
- The role-modification step suggested editing a cluster membership in place. Current Rancher documentation says to delete the membership and re-add it with the new roles, so I corrected that workflow.
- The verification section suggested `kubectl auth can-i --as=<username>` from an admin account. That impersonation example is not a reliable generic validation path for Rancher-managed users, so I replaced it with direct verification of the `ClusterRoleTemplateBinding` through the Rancher API.
- The troubleshooting section claimed the downstream cluster must be in an `Active` state for role assignments to take effect and referenced Pod Security Policies. I replaced that with an accurate role-scope check and a current reference to Pod Security Admission and OPA/Gatekeeper-style admission controls.

## Review Notes
- The manual UI workflow remains applicable to Rancher v2.7+, but the corrected automation example is specifically for Rancher v2.8+ because RK-API was introduced after v2.7.
- Rancher documents that legacy v3 API tokens are being phased out in newer releases. Using RK-API in the post avoids anchoring the tutorial to the previous API surface.
- The Terraform examples were technically correct after verification against the official `rancher2_cluster_role_template_binding` resource documentation.
- No live Rancher instance was available in the review environment, so runtime validation was performed against official documentation and Rancher source definitions rather than by executing the examples end-to-end.
