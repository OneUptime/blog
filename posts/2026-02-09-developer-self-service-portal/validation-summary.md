# Validation Summary: How to Build a Developer Self-Service Portal

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Kubernetes namespaces
- Kubernetes RBAC
- Kubernetes ResourceQuota
- Kubernetes LimitRange
- Kubernetes NetworkPolicy
- Kubernetes ServiceAccount, Deployment, and Service manifests
- Go
- Kubernetes client-go
- React
- Axios
- kubectl

## Sources Consulted
- Kubernetes Labels and Selectors: https://kubernetes.io/docs/concepts/overview/working-with-objects/labels/
- Kubernetes Object Names and IDs: https://kubernetes.io/docs/concepts/overview/working-with-objects/names
- Kubernetes Namespaces: https://kubernetes.io/docs/concepts/overview/working-with-objects/namespaces
- Kubernetes NetworkPolicy API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/network-policy-v1/
- Kubernetes Resource Quotas: https://kubernetes.io/docs/concepts/policy/resource-quotas/
- Kubernetes Limit Ranges: https://kubernetes.io/docs/concepts/policy/limit-range/
- Kubernetes RBAC authorization: https://kubernetes.io/docs/reference/access-authn-authz/rbac/
- Kubernetes kubectl generated reference: https://kubernetes.io/docs/reference/kubectl/
- Kubernetes client-go repository: https://github.com/kubernetes/client-go

## Issues Found
- The Go backend snippet used `networkingv1.NetworkPolicy` but did not import `k8s.io/api/networking/v1`. Added the missing import so the code is syntactically complete.
- The namespace metadata labels included `owner: req.Owner`, but the frontend collects owner as an email address. Kubernetes label values cannot contain `@`, so this would fail for normal email input. Removed the `owner` label and kept the owner in annotations, where email addresses are valid.
- The backend validated only non-empty `name` and `team` values, but generated namespace names must be valid RFC 1123 DNS labels. Added validation using Kubernetes' `validation.IsDNS1123Label` for the request name, team, and generated namespace name.
- The frontend name pattern allowed values such as a trailing hyphen that Kubernetes would reject. Updated the pattern and helper text to require a lowercase alphanumeric start and end.
- The introduction described the guide as a complete portal with monitoring integration and an operator pattern, but the implementation uses a direct client-go API service and does not include monitoring integration or an operator. Adjusted the wording to match the actual implementation.
- The NetworkPolicy section did not mention that NetworkPolicy enforcement depends on a compatible network plugin. Added a short caveat before the Kubernetes manifest.

## Review Notes
The local workspace does not have `go` or `kubectl` installed, so I could not compile the Go sample or run client-side Kubernetes manifest validation locally. The review was completed against current official Kubernetes documentation and the client-go repository. The approval workflow still uses placeholder methods such as `storeRequest` and `notifyApprovers`, which is acceptable for a conceptual extension snippet but would need concrete implementations in production.
