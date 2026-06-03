# Validation Summary: How to Use RBAC Policies That Prevent Privilege Escalation via Role Editing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- Kubernetes admission webhooks
- kubectl
- jq
- GitHub Actions

## Sources Consulted
- Kubernetes RBAC documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes admission webhook documentation: https://kubernetes.io/docs/reference/access-authn-authz/extensible-admission-controllers/
- Kubernetes ValidatingWebhookConfiguration API reference: https://kubernetes.io/docs/reference/kubernetes-api/extend-resources/validating-webhook-configuration-v1/
- Kubernetes kubectl create role reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_role/
- Kubernetes kubectl create rolebinding reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_rolebinding/
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- GitHub Actions workflow syntax documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout documentation: https://github.com/actions/checkout
- Automattic/action-required-review documentation: https://github.com/Automattic/action-required-review

## Issues Found
- The introduction said a user with permission to edit roles could add cluster-admin to their own role binding. I changed this to refer to editing role bindings with permission to bind high-privilege roles, because binding a ClusterRole to a subject is done through RoleBinding or ClusterRoleBinding resources and Kubernetes applies bind checks.
- The description of the `escalate` verb said it prevents users from creating roles with more permissions than they have. I changed this to clarify that `escalate` is the permission that allows bypassing the normal Kubernetes escalation check.
- The namespace-scoped RBAC administration example used a namespaced `Role` with a rule for `clusterroles`. I changed it to a `ClusterRole` referenced by a namespace-scoped `RoleBinding`, matching Kubernetes' documented pattern for granting reusable namespaced permissions and selected ClusterRole binding permission within a namespace.
- The audit commands were labeled as finding users with `escalate`, `bind`, and `impersonate`, but the commands list Role and ClusterRole objects. I changed the comments to say they find roles with those permissions.
- The escalation-prevention test expected `kubectl auth can-i create role` to return `yes`, but the sample Role only granted pod read permissions. I added `create` permissions for `roles` and `rolebindings` so the later escalation-denial examples exercise Kubernetes' privilege escalation checks as described.
- The GitHub Actions example referenced `github/required-reviews@v1`, which is not a valid GitHub-owned action. I replaced it with `Automattic/action-required-review@v5`, added the review submission trigger needed for review-based checks, updated `actions/checkout` to the current major version, and used a dedicated token secret for team review checks.

## Review Notes
- The Kubernetes YAML examples use current stable API versions (`rbac.authorization.k8s.io/v1` and `admissionregistration.k8s.io/v1`).
- The webhook example is structurally valid, but a real deployment still needs a reachable HTTPS webhook service and appropriate certificate trust configuration.
- `kubectl` was not installed in the local environment, so CLI behavior was reviewed against official Kubernetes command references rather than local command output.
