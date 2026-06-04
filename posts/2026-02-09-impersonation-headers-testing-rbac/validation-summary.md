# Validation Summary: How to Implement Impersonation Headers for Testing RBAC Policies

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Kubernetes RBAC
- Kubernetes user impersonation headers
- kubectl
- Kubernetes API authentication and authorization
- client-go
- Go
- Bash

## Sources Consulted
- Kubernetes User Impersonation documentation: https://kubernetes.io/docs/reference/access-authn-authz/user-impersonation/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl/
- Kubernetes kubectl create token reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes RBAC authorization documentation: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes SubjectAccessReview API reference: https://kubernetes.io/docs/reference/kubernetes-api/definitions/subject-access-review-v1-authorization/
- Go package documentation for k8s.io/client-go/rest ImpersonationConfig: https://pkg.go.dev/k8s.io/client-go/rest

## Issues Found
- The ClusterRole example allowed impersonating all users and then included a second "optional" rule with `resourceNames`, which did not actually limit user impersonation. Changed the user rule to include `resourceNames` directly so the restriction works as described.
- The direct API curl example used a token for the default service account, while the RBAC example only granted impersonation to the `admin` user. Added an `impersonator-sa` subject and updated the token example to use that service account so the request identity has the needed impersonation permission.
- The extra attributes kubectl example described extra scopes but only set `--as`, `--as-group`, and `--as-uid`. Added repeated `--as-user-extra=scopes=...` flags and added matching RBAC permissions for `uids` and `userextras/scopes`.
- The permission audit Go snippet started at an `import` block and omitted required imports for `context`, `fmt`, `metav1`, and `kubernetes`. Added `package main` and the missing imports so the snippet is syntactically complete.

## Review Notes
`kubectl` and `go` were not installed in the local workspace, so local command help and compilation checks could not be run. Verification was performed against official Kubernetes documentation and the Go package documentation for client-go.
