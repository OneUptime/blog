# Validation Summary: How to Configure Vault Agent for CI/CD on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu package management
- HashiCorp Vault
- Vault Agent
- Vault AppRole authentication
- Vault JWT/OIDC authentication
- Vault Agent templates and Consul Template functions
- systemd
- GitHub Actions
- GitLab CI/CD

## Sources Consulted
- HashiCorp Vault install documentation: https://developer.hashicorp.com/vault/install
- HashiCorp Vault Agent documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent
- HashiCorp Vault Agent AppRole auto-auth documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/autoauth/methods/approle
- HashiCorp Vault Agent template documentation: https://developer.hashicorp.com/vault/docs/agent-and-proxy/agent/template
- HashiCorp Vault Agent CLI documentation: https://developer.hashicorp.com/vault/docs/commands/agent
- HashiCorp Vault AppRole authentication documentation: https://developer.hashicorp.com/vault/docs/auth/approle
- HashiCorp Vault JWT/OIDC authentication documentation: https://developer.hashicorp.com/vault/docs/auth/jwt
- HashiCorp Vault JWT/OIDC API documentation: https://developer.hashicorp.com/vault/api-docs/auth/jwt
- Consul Template Go language reference: https://developer.hashicorp.com/consul/docs/reference/consul-template/go
- HashiCorp guidance for GitLab CI/CD secrets with Vault: https://developer.hashicorp.com/well-architected-framework/secure-systems/secure-applications/ci-cd-secrets/gitlab

## Issues Found
- The Ubuntu install snippet used `lsb_release -cs` without installing `lsb-release`. Added `lsb-release` to the prerequisite package install command so the documented command works on minimal Ubuntu installs.
- The AppRole creation command had inline comments after line-continuation backslashes, which breaks shell parsing. Moved those details out of the command and kept the command syntactically valid.
- The text said the generated Secret ID was used once, but the role did not enforce single use. Added `secret_id_num_uses=1` to match the described behavior.
- The Vault Agent architecture and configuration included the Agent API proxy, which HashiCorp now documents as deprecated in Vault Agent. Removed the runnable `api_proxy` and `listener` configuration and changed the architecture note to Vault Agent caching.
- The Vault Agent template examples used Handlebars-style comments (`{{!-- --}}`), which are not valid Go template comments. Replaced them with Go template comments (`{{/* */}}`).
- The Vault Agent template `perms` values were unquoted numbers, while the official template configuration documents `perms` as a string. Changed them to `"0640"`.
- The template reload examples used `command`, which is deprecated in favor of `exec`. Replaced the commented reload examples with `exec` blocks.
- The GitHub Actions example wrote AppRole files under `/tmp` but did not explain that the CI Agent config must point there. Added a short comment clarifying the expected `ci-config.hcl` paths.
- The GitLab JWT role example passed `bound_claims` as a CLI string. HashiCorp recommends JSON input for map fields, so changed the role creation command to use JSON via stdin.
- The nginx PKI paragraph claimed Vault Agent reloads nginx automatically. Clarified that `pkiCert` refreshes certificates based on expiration and that nginx reloads require an explicit permitted `exec` hook.

## Review Notes
The examples are still illustrative and assume the Vault server already has the KV, database, and PKI secrets engines configured at the paths shown. The GitHub Actions example also assumes `jq`, `curl`, Vault CLI, and a matching `/etc/vault-agent/ci-config.hcl` are available on the self-hosted runner.
