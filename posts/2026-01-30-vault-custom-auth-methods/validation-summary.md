# Validation Summary: How to Build Vault Custom Auth Methods

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (auth methods)
- Vault AppRole auth method
- Vault Kubernetes auth method
- Vault OIDC / JWT auth method
- Vault Plugin SDK (Go)
- Terraform (Vault provider)
- HCL configuration
- Kubernetes label selectors

## Sources Consulted
- Vault AppRole API: https://developer.hashicorp.com/vault/api-docs/auth/approle
- Vault Kubernetes auth API: https://developer.hashicorp.com/vault/api-docs/auth/kubernetes
- Vault JWT/OIDC auth API: https://developer.hashicorp.com/vault/api-docs/auth/jwt
- Vault plugin register docs: https://developer.hashicorp.com/vault/docs/plugins/register
- Vault Auth tune docs: https://developer.hashicorp.com/vault/docs/commands/auth/tune
- vault-plugin-auth-kubernetes CHANGELOG: https://github.com/hashicorp/vault-plugin-auth-kubernetes/blob/main/CHANGELOG.md
- Vault SDK package: https://pkg.go.dev/github.com/hashicorp/vault/sdk
- Terraform Vault provider `vault_auth_backend`: https://registry.terraform.io/providers/hashicorp/vault/latest/docs/resources/auth_backend
- Go language spec on constant representability: https://go.dev/ref/spec#Representability

## Issues Found

1. **Invalid HCL config block (lines 45-55)** — Original snippet used invented syntax:
   ```hcl
   path "auth/custom-approle" {
     type = "approle"
     description = "Custom AppRole for CI/CD pipelines"
   }
   ```
   This is not valid Vault policy syntax (policies use `capabilities`, not `type`/`description`), not valid Vault server config (which uses stanzas like `listener`/`storage`), and not valid Terraform (which uses `resource` blocks). **Fix:** Replaced with a valid Terraform `vault_auth_backend` resource block, which matches the intent of the "approle-config.hcl" label and the surrounding narrative about configuring the AppRole mount.

2. **Go code TTL using `3600 * 1e9` (Go plugin example)** — The original code assigned an untyped floating-point constant to `logical.LeaseOptions.TTL` (a `time.Duration`/`int64`). At minimum this is unidiomatic; depending on Go version it can also fail to compile cleanly. **Fix:** Changed to `time.Hour` and added `"time"` to the import block. This is the canonical way to express durations in Go with the Vault SDK.

## Review Notes

- The post's description mentions "Kubernetes, AWS IAM, OIDC, and AppRole" but the post does not actually cover AWS IAM. This is a minor discrepancy in the frontmatter but not a technical inaccuracy in the body, so it was left as-is per the instruction to limit changes to technical errors.
- The plugin registration command `vault plugin register -sha256=$SHA256 auth vault-plugin-auth-custom` works because `-command` defaults to the plugin name when omitted. For production use, consider adding `-command` explicitly and, in Vault 1.12+, `-version` for versioned plugin tracking.
- `bound_service_account_namespace_selector` (Kubernetes auth) was added in `vault-plugin-auth-kubernetes` v0.18.0 (Feb 2024, shipped with Vault ~1.16). The selector format is a Kubernetes `LabelSelector` and only supports `matchLabels` (not `matchExpressions`). The example value `"environment in (prod, staging)"` is shown as a label-selector string, which is fine as a conceptual illustration; for real deployments users will need to pass `matchLabels` JSON/YAML and ensure the Vault service account has cluster-level permission to read namespaces.
- The `disable_local_ca_jwt=false` setting is config-level on the Kubernetes auth mount and is incompatible with `bound_service_account_namespace_selector`. The two examples are shown in separate steps so this is not a runtime conflict in the post, but readers combining the two features in one deployment should be aware.
- The OIDC callback URL `https://vault.example.com/ui/vault/auth/oidc/oidc/callback` looks redundant but is correct: the pattern is `/ui/vault/auth/<mount>/oidc/callback`, and the default mount name is literally `oidc`.
- The Go plugin code has several imports (`encoding/json`, `fmt`, `net/http`, `os`, `github.com/hashicorp/vault/api`, `github.com/hashicorp/vault/sdk/plugin`) that are not exercised by the shown snippet but would be used by parts of a real plugin (e.g., `main()` with `plugin.ServeMultiplex`, the unshown `validateWithIdentityService` HTTP call). Acceptable for a partial example.
- `handleConfigRead` and `validateWithIdentityService` are referenced but not defined in the snippet. Acceptable as a partial example.
