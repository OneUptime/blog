# Validation Summary: How to configure Vault Kubernetes auth method for pod authentication

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault Kubernetes auth method
- HashiCorp Vault ACL policies and KV v2 secrets
- Kubernetes ServiceAccounts and projected service account tokens
- Kubernetes TokenReview API
- Vault CLI and HTTP API
- Go Vault API client
- Python hvac client
- Bash, curl, and jq

## Sources Consulted
- HashiCorp Vault Kubernetes auth method documentation: https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault Kubernetes auth method API documentation: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- Kubernetes ServiceAccount administration documentation: https://kubernetes.io/docs/reference/access-authn-authz/service-accounts-admin/
- HashiCorp Vault Go Kubernetes auth package documentation: https://pkg.go.dev/github.com/hashicorp/vault/api/auth/kubernetes
- hvac Kubernetes auth method documentation: https://python-hvac.org/en/stable/source/hvac_api_auth_methods.html
- hvac KV v2 documentation: https://python-hvac.org/en/v2.4.0/usage/secrets_engines/kv_v2.html
- HashiCorp Vault KV v2 API documentation: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2

## Issues Found
- The Kubernetes auth configuration example attempted to read `vault` ServiceAccount token data from `.secrets[0]`. This depends on legacy auto-generated ServiceAccount token Secrets, which are not created by default in modern Kubernetes. Updated the setup to grant Vault's ServiceAccount the `system:auth-delegator` role and configure Kubernetes auth with only `kubernetes_host`, allowing Vault running in Kubernetes to use its local projected ServiceAccount token and CA certificate.
- The Vault role examples used deprecated role fields: `policies`, `ttl`, `max_ttl`, and `period`. Replaced them with the current `token_policies`, `token_ttl`, `token_max_ttl`, and `token_period` fields.
- The KV v2 policy snippets granted `list` on `secret/data/...` paths. KV v2 listing uses the `metadata/` path, while reads use the `data/` path. Split the policy rules so `read` applies to `secret/data/...` and `list` applies to `secret/metadata/...`.
- The Go example imported `context` without using it and used the deprecated `ioutil.ReadFile` helper. Removed the unused import and changed the token read to `os.ReadFile`.
- The Python example imported `os` and assigned the Kubernetes login response without using either. Removed the unused import and assignment.
- The troubleshooting section checked `ServiceAccount.secrets` to confirm token existence, which is no longer reliable for projected ServiceAccount tokens. Updated it to check the token file mounted in the running pod.
- The token renewal snippet called an undefined `authenticate()` function. Changed the line to a comment instructing applications to call their own login function when renewal fails.
- The audience-restricted role example did not note that clients need to present a ServiceAccount token with the matching audience. Added a comment to make that requirement explicit.

## Review Notes
- The examples assume Vault is running inside the Kubernetes cluster as `vault` in the `vault` namespace. If Vault runs outside the cluster, the Kubernetes auth configuration needs an explicit reviewer JWT and CA configuration appropriate for that deployment.
- The examples use HTTP service URLs for simplicity. Production Vault deployments should normally use TLS.
- `hashicorp/vault:latest` is convenient for testing, but pinning an image version is preferable for repeatable deployments.
