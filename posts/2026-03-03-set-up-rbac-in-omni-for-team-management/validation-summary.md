# Validation Summary: How to Set Up RBAC in Omni for Team Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Sidero Omni
- Omni RBAC and Access Policies (ACLs)
- omnictl CLI
- Talos Linux
- Kubernetes RBAC
- Omni service accounts
- Omni audit logs

## Sources Consulted
- Sidero Omni CLI reference: https://docs.siderolabs.com/omni/reference/cli
- Sidero Omni security model: https://docs.siderolabs.com/omni/security-and-authentication/security-model
- Sidero Omni Access Policies (ACLs) reference: https://docs.siderolabs.com/omni/reference/acls
- Sidero Omni Manage Access Policies guide: https://docs.siderolabs.com/omni/security-and-authentication/how-to-manage-acls
- Sidero Omni service account guide: https://docs.siderolabs.com/omni/omni-cluster-setup/create-an-omni-service-account
- Sidero Omni audit logs guide: https://docs.siderolabs.com/omni/cluster-management/using-audit-log
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The post described Omni permissions as directly organization-level and cluster-level roles. Updated the wording to clarify that account roles are global, while Access Policies (ACLs) provide cluster-scoped access control.
- The post omitted Omni's `None` role. Added a short `None Role` subsection because it is one of the documented account roles and is important for SAML/default-user behavior.
- The `omnictl access invite`, `omnictl access update`, `omnictl access list`, and `omnictl access revoke` commands are not documented current Omni CLI commands. Replaced them with `omnictl user create`, `omnictl user set-role`, `omnictl user list`, and `omnictl user delete`.
- The service account examples used `--role` without disabling the default `--use-user-role=true` behavior, which would cause the explicit role to be ignored. Added `--use-user-role=false` to both service account creation examples.
- The service account revocation example used `omnictl serviceaccount delete`, but the documented command is `omnictl serviceaccount destroy`. Updated the command.
- The audit log examples used non-existent `omnictl audit list` flags. Replaced them with the documented `omnictl audit-log` command and `jq` filters for user and cluster-creation filtering.
- The role-change behavior claimed immediate application on the next dashboard load or API call. Adjusted this to say permissions apply after the next authentication, matching Omni's token-based authentication model more closely.

## Review Notes
The Kubernetes RBAC manifest is syntactically valid for `rbac.authorization.k8s.io/v1`. For strict least-privilege Kubernetes access through Omni, Omni users with the `Operator` role or higher receive `system:masters` by default, so Reader/None plus ACL impersonation is safer for constrained in-cluster access.
