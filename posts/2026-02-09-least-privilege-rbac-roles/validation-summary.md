# Validation Summary: How to Design Least Privilege RBAC Roles for Kubernetes Application Deployments

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes Roles and RoleBindings
- Kubernetes ServiceAccounts
- Kubernetes Deployments
- kubectl authorization checks
- Kubernetes audit logging

## Sources Consulted
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/authorization/
- kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- kubectl rolebinding reference: https://kubernetes.io/docs/reference/generated/kubectl/kubectl-commands#rolebinding
- Kubernetes ServiceAccounts documentation: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes Deployment documentation: https://kubernetes.io/docs/concepts/workloads/controllers/deployment/
- Kubernetes audit logging documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes core Event API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/event-v1/

## Issues Found
- The runtime role used `resourceNames` with the top-level `create` verb for a ConfigMap. Kubernetes RBAC cannot restrict top-level create requests by resource name because the object name might not be known at authorization time. I removed `create`, added `patch`, and clarified that the leader-election ConfigMap should be created ahead of time for name-scoped runtime permissions.
- The explanation of `resourceNames` omitted the list/watch caveat. I added that clients must include a matching `metadata.name` field selector when using list or watch with `resourceNames`.
- The Deployment example was missing the required `apps/v1` `.spec.selector` and matching pod template labels. I added a minimal selector and matching labels.
- The section on restricting specific resources incorrectly said to use field selectors and label selectors for RBAC control, and the example claimed to read deployments with a specific label. Kubernetes RBAC does not support label-selector restrictions. I changed the text to use `resourceNames` for named-object access and noted that label-based restrictions require admission control or another policy layer.
- The time-bound access section said to use token requests, but the example used temporary RoleBindings for a human user. I changed the sentence to describe temporary RoleBindings.
- The `kubectl auth can-i` examples used singular resource names. Kubernetes shortcuts often resolve these, but the official examples use resource type syntax such as `deployments` and `TYPE/NAME`; I changed the examples to `deployments` and `configmaps/myapp-config`.

## Review Notes
`kubectl` was not installed in the review environment, so command verification was performed against the official Kubernetes kubectl reference instead of local `kubectl --help` output. The examples use current `rbac.authorization.k8s.io/v1`, `apps/v1`, `batch/v1`, and core API resources. Core `v1` Events remain documented, although new event integrations may prefer the `events.k8s.io/v1` API depending on client behavior.
