# Validation Summary: How to Use GitLab CI with HashiCorp Vault

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- GitLab CI/CD
- GitLab ID tokens / JWT
- HashiCorp Vault
- Vault JWT auth method
- Vault KV secrets engine

## Sources Consulted
- GitLab Docs: Use HashiCorp Vault secrets in GitLab CI/CD: https://docs.gitlab.com/ci/secrets/hashicorp_vault/
- GitLab Docs: OpenID Connect (OIDC) Authentication Using ID Tokens: https://docs.gitlab.com/ci/secrets/id_token_authentication/
- GitLab Docs: Update HashiCorp Vault configuration to use ID Tokens: https://docs.gitlab.com/ci/secrets/convert-to-id-tokens/
- HashiCorp Developer: JWT/OIDC auth method API: https://developer.hashicorp.com/vault/api-docs/auth/jwt
- HashiCorp Developer: Vault CLI usage: https://developer.hashicorp.com/vault/docs/commands
- HashiCorp Developer: KV secrets engine: https://developer.hashicorp.com/vault/docs/secrets/kv

## Issues Found
- The CI example used `CI_JOB_JWT`, which GitLab documents as deprecated in favor of job `id_tokens` for Vault authentication. Updated the example to request `VAULT_ID_TOKEN` with an audience and pass that token to `vault login`.
- The Vault role used `bound_audiences="https://gitlab.example.com"`, but the updated GitLab ID token example sets the audience to the Vault service URL. Updated the role audience to `https://vault.example.com` so it matches the token `aud` claim.
- The Vault KV CLI example used `secret/data/app`, which is the KV v2 API path form. The `vault kv get` CLI command should use the logical path, such as `secret/app`, and the CLI maps that to `secret/data/app` internally for KV v2.

## Review Notes
The post remains intentionally concise. A future expansion could show the Vault auth method configuration command and project-specific `bound_claims` for stricter role scoping, but the corrected examples are technically valid as written.
