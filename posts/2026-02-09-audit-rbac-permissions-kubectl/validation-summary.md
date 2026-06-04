# Validation Summary: How to Audit Kubernetes RBAC Permissions Using kubectl auth can-i

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes RBAC
- kubectl auth can-i
- Kubernetes audit policy
- Fairwinds rbac-lookup
- kubectl-who-can
- jq
- GitHub Actions

## Sources Consulted
- Kubernetes kubectl auth can-i reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_auth/kubectl_auth_can-i/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Fairwinds rbac-lookup documentation: https://rbac-lookup.docs.fairwinds.com/
- Fairwinds rbac-lookup usage documentation: https://rbac-lookup.docs.fairwinds.com/usage/
- Aqua Security kubectl-who-can README: https://github.com/aquasecurity/kubectl-who-can
- GitHub actions/checkout README: https://github.com/actions/checkout
- GitHub actions/upload-artifact README and deprecation notice: https://github.com/actions/upload-artifact
- Azure k8s-set-context README: https://github.com/Azure/k8s-set-context

## Issues Found
- The group impersonation example used `--as-group` without also impersonating a user. Added `--as=rbac-audit` so the example models a complete impersonation request.
- The rbac-lookup installation command used the old `reactiveops` Homebrew tap and an invalid direct binary URL. Updated installation examples to the documented Fairwinds Homebrew tap and asdf method.
- The rbac-lookup usage examples treated rbac-lookup as a permission reverse-query tool. Fairwinds documents it as a subject-to-role-binding lookup tool, so the examples now query users, service accounts, and groups by subject and use `--output wide` instead of unsupported JSON output.
- The RoleBinding/ClusterRoleBinding jq examples could report the wrong service account when a binding had multiple subjects. Updated them to iterate matching service account subjects directly.
- The report generator used a quoted heredoc, so `$(date)` would not expand in the generated report. Changed that heredoc so the generated timestamp is evaluated.
- The cluster-admin jq report used independent subject expansions, which could produce incorrect subject/name combinations. Updated it to iterate each subject once.
- The report generator used rbac-lookup for "who can delete secrets" and "who can exec into pods" queries. Replaced those with kubectl-who-can, which is designed for reverse permission checks.
- The wildcard jq checks used `contains("*")` instead of exact wildcard matches and missed safe optional array iteration in one case. Updated them to test for exact `*` values.
- The audit-log jq query could fail on audit events without `objectRef.resource`. Added a default empty string before checking the resource name.
- The cluster-admin check in the GitHub Actions workflow used basic `grep` with an extended-regex pattern, so the allowlist would not work as intended. Replaced it with `grep -Ev` and a captured `UNEXPECTED_ADMINS` variable.
- The workflow used deprecated or outdated GitHub Actions versions. Updated checkout, k8s-set-context, and upload-artifact to current major versions, and replaced the invalid rbac-lookup binary install with kubectl-who-can installation.

## Review Notes
The Kubernetes audit policy fields and `kubectl auth can-i` command syntax align with the current Kubernetes documentation. The post now distinguishes rbac-lookup, which lists bindings for subjects, from kubectl-who-can, which answers reverse permission questions.
