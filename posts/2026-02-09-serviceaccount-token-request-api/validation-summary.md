# Validation Summary: How to Use ServiceAccount Token Request API for Short-Lived Tokens

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes ServiceAccounts
- Kubernetes TokenRequest API
- kubectl
- Kubernetes RBAC
- Kubernetes audit policy
- Go client-go
- Kubernetes Python client

## Sources Consulted
- Kubernetes ServiceAccounts concepts: https://kubernetes.io/docs/concepts/security/service-accounts/
- Kubernetes ServiceAccount administration and TokenRequest documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- Kubernetes `kubectl create token` reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_create/kubectl_create_token/
- Kubernetes auditing documentation: https://kubernetes.io/docs/tasks/debug/debug-cluster/audit/
- Kubernetes ServiceAccount API reference: https://kubernetes.io/docs/reference/kubernetes-api/core/service-account-v1/
- Kubernetes TokenRequest API reference (Kubernetes v1.32 static docs): https://v1-32.docs.kubernetes.io/zh-cn/docs/reference/kubernetes-api/authentication-resources/token-request-v1/
- client-go `ServiceAccountInterface.CreateToken` reference: https://pkg.go.dev/k8s.io/client-go/kubernetes/typed/core/v1
- Kubernetes authentication API Go types: https://pkg.go.dev/k8s.io/api/authentication/v1
- Official Kubernetes Python client repository: https://github.com/kubernetes-client/python

## Issues Found
- The post described TokenRequest as a Kubernetes resource. Updated this to ServiceAccount subresource, matching the documented `/serviceaccounts/{name}/token` API.
- The post implied requested expiration durations are exact. Updated wording and examples to use the returned `status.expirationTimestamp`, because Kubernetes documents `expirationSeconds` and `kubectl --duration` as requested lifetimes and the API server may return a different lifetime.
- The first Go example calculated expiration with `time.Now().Add(1*time.Hour)`. Updated it to return and print `resp.Status.ExpirationTimestamp.Time`.
- The Python example calculated expiration locally from the requested duration. Updated it to return and print `response.status.expiration_timestamp`.
- The pod-bound Go example said the UID was filled by the API server. Updated the comment to avoid implying that callers can always rely on that behavior and to note that setting the UID pins the token to a specific object instance.
- The token cache Go example used `fmt` and `rest` without importing them. Added the missing imports.
- The operator Go example assigned `string(pod.UID)` to a `types.UID` field. Updated it to use `pod.UID` directly.
- The monitoring section implied that appending a policy file enables audit logging. Updated it to say the policy must be passed to `kube-apiserver` and paired with an audit backend such as `--audit-log-path` or a webhook.

## Review Notes
The `kubectl create token` commands and flags are consistent with current Kubernetes documentation. `kubectl` and Go were not installed in the workspace, and the Kubernetes Python package was not installed, so local execution was not possible; examples were reviewed against official API and client references instead.
