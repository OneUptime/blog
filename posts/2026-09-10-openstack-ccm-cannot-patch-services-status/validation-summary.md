# Validation Summary: How to Fix OpenStack CCM Cannot Patch services/status Errors

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Kubernetes RBAC and ServiceAccounts
- kubectl impersonation and subresources
- OpenStack Cloud Controller Manager v1.36.0
- jq

## Sources Consulted

- [Kubernetes RBAC authorization](https://kubernetes.io/docs/reference/access-authn-authz/rbac/)
- [kubectl auth can-i](https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/)
- [OCCM v1.36.0 ClusterRoles](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/manifests/controller-manager/cloud-controller-manager-roles.yaml)
- [OCCM v1.36.0 DaemonSet manifest](https://github.com/kubernetes/cloud-provider-openstack/blob/v1.36.0/manifests/controller-manager/openstack-cloud-controller-manager-ds.yaml)
- [Kubernetes JSONPath reference](https://kubernetes.io/docs/reference/kubectl/jsonpath/)
- [jq manual](https://jqlang.org/manual/)

## Issues Found

No technical issues found.

## Review Notes

- Reviewed on 2026-09-10 against the cited official documentation and source. This was a static technical review, not an execution test.
- Read the complete post and reviewed the supplemental ClusterRole/ClusterRoleBinding, identity inspection, impersonation checks, and jq binding query.
- The core API group, `services/status` resource, and `patch` verb match the upstream role. The separate kubectl subresource flag and namespaced RoleBinding explanation are correct.
- The supplemental role is intentionally incomplete; its binding must target the identity from the real denial. No live authorization, webhook, cloud, or Service status checks were performed.
