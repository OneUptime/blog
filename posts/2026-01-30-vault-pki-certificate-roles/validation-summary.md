# Validation Summary: How to Implement Vault PKI Certificate Roles

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (PKI secrets engine)
- Vault CLI (`vault write`, `vault read`, `vault policy`, `vault audit`, `vault token`)
- Vault HTTP API (curl)
- Python (hvac library)
- Go (`github.com/hashicorp/vault/api`)
- cert-manager (Kubernetes)
- HCL (Vault policy language)
- Prometheus (Vault telemetry)
- Mermaid (diagrams)

## Sources Consulted
- HashiCorp Vault PKI Secrets Engine docs: https://developer.hashicorp.com/vault/docs/secrets/pki
- Vault PKI API reference (roles endpoint): https://developer.hashicorp.com/vault/api-docs/secret/pki
- Vault PKI setup tutorial: https://developer.hashicorp.com/vault/tutorials/pki/pki-engine
- Vault CLI command reference: https://developer.hashicorp.com/vault/docs/commands
- Vault telemetry metrics reference: https://developer.hashicorp.com/vault/docs/internals/telemetry
- hvac Python client docs (PKI module): https://hvac.readthedocs.io/en/stable/usage/secrets_engines/pki.html
- HashiCorp Vault Go API client: https://pkg.go.dev/github.com/hashicorp/vault/api
- cert-manager Vault issuer docs: https://cert-manager.io/docs/configuration/vault/
- Bash reference manual on line continuation and comments

## Issues Found
1. **Broken bash line continuations with inline comments**: Several `vault write` examples contained `#` comments between backslash-continued lines (multi-domain role, mtls-client role, service-mesh role, and the complete-example role). In bash, a `\<newline>` continues the logical line, so the `#` that follows starts a comment that terminates at the next newline — orphaning all subsequent parameters as separate commands. Fixed by moving the explanatory comments above the command (or merging them into the header comment block) so the `vault write` invocation is a single contiguous line continuation.
2. **Go example would not compile — unused `context` import**: The `context` package was imported but never used, which is a Go compile error. Removed the unused import.
3. **Go example would not compile — unused `caChain` variable**: `caChain := secret.Data["ca_chain"].([]interface{})` was declared but never referenced, which is a Go compile error. Removed the unused declaration.

## Review Notes
- All Vault PKI role parameters used in the post (`allowed_domains`, `allow_subdomains`, `allow_bare_domains`, `allow_glob_domains`, `allow_any_name`, `allow_wildcard_certificates`, `allow_ip_sans`, `allowed_uri_sans`, `allowed_other_sans`, `enforce_hostnames`, `key_type`, `key_bits`, `signature_bits`, `key_usage`, `ext_key_usage`, `server_flag`, `client_flag`, `code_signing_flag`, `email_protection_flag`, `ttl`, `max_ttl`, `organization`, `ou`, `country`, `locality`, `province`, `generate_lease`, `no_store`, `require_cn`, `policy_identifiers`) match the official Vault PKI API reference.
- The hvac `client.secrets.pki.generate_certificate(name, common_name, extra_params, mount_point)` signature matches the upstream hvac PKI module.
- The cert-manager `ClusterIssuer` schema for Vault Kubernetes auth (`spec.vault.{server,path,auth.kubernetes.{mountPath,role,secretRef}}`) matches the cert-manager Vault issuer configuration reference.
- The Prometheus metric names `vault.secrets.pki.tidy.cert_store_current_entry` and `vault.secrets.pki.tidy.revoked_cert_deleted_count` are present in Vault's telemetry documentation.
- The Go example silently ignores the error returns from `os.WriteFile`. This is not a syntactic error, but production code should check those errors. Left as-is to avoid expanding the example beyond its illustrative scope.
- Two examples define a role named `internal-services` with different configurations (in the Wildcard/Glob Patterns section and in the TTL Strategy section). Recreating the role would simply overwrite the prior config, so this is not technically incorrect for stand-alone snippets — but a reader running both in sequence will end up with only the second definition. Worth noting but not a defect.
- The post does not pin a specific Vault version. `allow_wildcard_certificates` was added in Vault 1.10+; readers on older versions may need to use only `allow_subdomains` patterns instead.
