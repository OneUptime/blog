# Validation Summary: How to Use Vault Agent for Auto-Auth

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (Vault Agent / Auto-Auth)
- AppRole, Kubernetes, AWS, Azure, GCP, JWT/OIDC auth methods
- Vault Agent Templates (Consul Template syntax)
- Vault Agent Caching with persistent cache
- Kubernetes (Deployment, ConfigMap, ServiceAccount, sidecar pattern)
- HCL configuration language
- Python (hvac client)
- Bash / vault CLI

## Sources Consulted
- [Vault Agent Auto-Auth overview](https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth)
- [Auto-Auth: AppRole method](https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/approle)
- [Auto-Auth: Kubernetes method](https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/kubernetes)
- [Auto-Auth: AWS method](https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/aws)
- [Auto-Auth: Azure method](https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/azure)
- [Auto-Auth: GCP method](https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/gcp)
- [Auto-Auth: JWT method](https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/jwt)
- [Vault Agent Caching](https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/caching)
- [Vault Agent Templates](https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template)
- [Vault Agent configuration](https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent)
- [Vault Kubernetes auth method](https://developer.hashicorp.com/vault/docs/auth/kubernetes)

## Issues Found

1. **Incorrect `vault login` syntax for Kubernetes auth method.** The troubleshooting section used
   `vault login -method=kubernetes role=myapp`, but the Kubernetes auth method does not ship with a
   CLI auth handler — there is no `-method=kubernetes` helper. The canonical way to authenticate
   manually is to call the login API endpoint with `vault write auth/kubernetes/login role=... jwt=...`,
   passing the service account JWT explicitly. Updated the command accordingly so users following the
   troubleshooting steps actually get an authentication attempt rather than an "unknown auth method"
   error.

2. **Undocumented `role_arn` parameter in AWS auto-auth example.** The AWS method config example
   included a commented-out `role_arn = "arn:aws:iam::123456789012:role/VaultAuth"` line described as
   a way to specify an IAM role ARN for cross-account auth. The Vault Agent AWS auto-auth method
   schema (type, role, region, access_key, secret_key, session_token, header_value, nonce,
   credential_poll_interval) does not include `role_arn`, so suggesting it as an optional config key
   was misleading. Removed the commented option.

## Review Notes

- AppRole, Kubernetes, Azure, GCP, and JWT auto-auth config blocks were all verified against the
  HashiCorp Vault Agent documentation and use accurate field names (e.g., `role_id_file_path`,
  `secret_id_response_wrapping_path`, `resource`, `service_account`, `path`,
  `remove_jwt_after_reading`).
- `template_config` parameters (`exit_on_retry_failure`, `static_secret_render_interval`) and
  `template` block parameters (`source`, `destination`, `command`, `perms`, `error_on_missing_key`,
  `contents`) match the documented schema.
- Cache `persist` of type `kubernetes` is correct — at the time of writing it is the only persistent
  cache backend Vault Agent ships with. If HashiCorp ever expands this, the example may want to be
  re-checked.
- The "Vault Agent automatically renews at 2/3 of TTL" comment matches the documented renewal
  behavior (with jitter).
- The Kubernetes deployment manifest pins `hashicorp/vault:1.15`. This is a fine known-good version,
  but readers deploying today may want to bump to a more recent stable Vault image.
- `vault agent` is the legacy CLI; newer Vault releases also expose `vault proxy` for the caching
  subset of features. The post correctly focuses on the agent path for auto-auth, which remains the
  documented approach.
- The claim that AWS auth supports "Lambda execution roles" is accurate insofar as Lambda's IAM
  credentials work with the `iam` auth type — there is no distinct Lambda method.
