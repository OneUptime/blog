# Validation Summary: How to Implement Vault MFA Configuration

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- HashiCorp Vault (Login MFA, Step-Up Enterprise MFA)
- TOTP (Time-based One-Time Password)
- Duo Security
- Okta Verify
- PingID
- Vault ACL policies (HCL)
- Vault Sentinel policies (Enterprise)
- Vault Control Groups (Enterprise)
- Vault audit logging (file, syslog)
- Bash scripting (jq, qrencode, awk)

## Sources Consulted
- Vault Login MFA docs: https://developer.hashicorp.com/vault/docs/auth/login-mfa
- Vault TOTP MFA API: https://developer.hashicorp.com/vault/api-docs/secret/identity/mfa/totp
- Vault Duo MFA API: https://developer.hashicorp.com/vault/api-docs/secret/identity/mfa/duo
- Vault Okta MFA API: https://developer.hashicorp.com/vault/api-docs/secret/identity/mfa/okta
- Vault login-enforcement API: https://developer.hashicorp.com/vault/api-docs/secret/identity/mfa/login-enforcement
- Vault audit command docs: https://developer.hashicorp.com/vault/docs/commands/audit
- Vault token create CLI reference (`vault token create -h`)

## Issues Found

1. **TOTP default algorithm misstated by omission.** The parameter list described `algorithm` as "SHA1, SHA256, or SHA512" without noting the default. Vault's default is SHA1. Updated the parameter explanation to record this.

2. **Invalid HCL MFA block in sensitive-paths policy.** The policy used `required_parameters = ["mfa_method_name"]` and an `mfa { method_id = "..." }` block to enforce path-level MFA. Neither construct exists in Vault ACL policy HCL — `required_parameters` constrains request parameters, not MFA. Replaced with the legacy Step-Up Enterprise MFA `mfa_methods = [...]` field on the path block and added a note that Vault Community Edition has no per-path MFA in ACL — enforcement is via `identity/mfa/login-enforcement`.

3. **Sentinel policy used dotted access on a hyphenated key.** `mfa.methods.my-totp.valid` is not valid Sentinel because `my-totp` is parsed as subtraction. Replaced with bracket notation: `mfa.methods["my-totp"].valid`.

4. **Recovery codes do not exist in Vault Login MFA.** The "Generating Recovery Codes" subsection claimed that `admin-generate` returns `recovery_codes`. The TOTP `admin-generate` endpoint only returns `barcode` (base64 PNG) and `url` (otpauth URL); Vault Login MFA has no built-in recovery-code feature. Rewrote the subsection (now "Re-Enrollment as Recovery") to describe the actual recovery flow: `admin-destroy` followed by `admin-generate`.

5. **`vault delete` used on a POST endpoint.** The admin reset procedure ran `vault delete sys/mfa/method/totp/my-totp/admin-destroy entity_id=...`. `admin-destroy` is a POST operation that requires `entity_id` in the body; `vault delete` would not pass the parameter. Changed to `vault write`.

6. **`vault audit log` is not a real subcommand.** The admin reset and monitoring examples used `vault audit log -format=json | jq ...`. The `vault audit` command only supports `enable`, `disable`, and `list`. Audit log records are written to whatever sink is configured (file, syslog, socket). Replaced with reading the configured file path directly via `jq`.

7. **`admin-generate` example included a redundant/unsupported `method_name`.** The endpoint URL already encodes the method, and `admin-generate` doesn't accept a `method_name` body parameter. Removed it from the example.

8. **Self-service policy used non-existent paths.** The self-service ACL policy granted access to `identity/mfa/method/totp/generate` and `identity/mfa/method/totp/admin-destroy` (no method name). For consistency with the rest of the post (which uses `sys/mfa/method/...`), changed to `sys/mfa/method/totp/my-totp/generate` and `sys/mfa/method/totp/my-totp/admin-destroy`. Also removed the `allowed_parameters` constraint on the `generate` path since the user `generate` endpoint takes no `entity_id` — it uses the calling token's entity.

9. **Self-service enrollment script passed `entity_id` to the user `generate` endpoint.** The user-facing `generate` endpoint derives the entity from the calling token and does not accept an explicit `entity_id`. Removed the parameter and added `-force` since the body is now empty.

10. **`vault write auth/token/create` with repeated `meta="key=value"` does not set metadata correctly.** `meta` is a map field; passing two string values via `vault write` does not produce two map entries (the second overwrites the first, and the value is a string, not a key-value pair). Replaced with `vault token create -metadata=k=v -metadata=k=v` and used `-use-limit` (the documented CLI flag for `num_uses`).

11. **`vault login -mfa="method:code"` flag does not exist.** Vault's CLI does not document a `-mfa` flag. The single-phase approach uses an `X-Vault-MFA` request header (`-header="X-Vault-MFA: method:code"`); the two-phase approach uses `vault write sys/mfa/validate mfa_request_id=... mfa_payload=...`. Updated both the Step 4 example and the multiple-MFA login example to use the supported mechanisms.

## Review Notes

- The post consistently uses the `sys/mfa/method/...` and `sys/mfa/login-enforcement/...` API paths. Vault's current canonical Login MFA paths are `identity/mfa/method/...` and `identity/mfa/login-enforcement/...`. The `sys/mfa/...` paths originated with Step-Up Enterprise MFA and continued to be referenced for Login MFA in early Vault 1.10 documentation; the `identity/mfa/...` paths are now the documented form. I left the `sys/mfa/...` paths in place since changing them would not be a localized fix and the endpoints still respond in current Vault releases — but a future revision should standardize on `identity/mfa/...`.
- The Control Groups example (`secret/data/production/*`) is missing an `approvals` value in the `identity` block, which Control Groups normally require. Left as-is because the surrounding sentence is illustrative rather than a complete working example.
- The `auth_method_accessors`, `auth_method_types`, `identity_group_ids`, and `identity_entity_ids` fields on `login-enforcement` are list types; the post passes single strings, which Vault accepts as single-element lists.
- The Duo/Okta/PingID `mount_accessor` parameter — required when binding an MFA method to a specific auth mount — is omitted from those examples. This is a documentation gap rather than a syntactic error and was left untouched to avoid introducing unverified mount accessor values; a future revision should add it with an explanatory note.
- The `vault audit enable file file_path=...` and `vault audit enable syslog tag=... facility=...` commands are correct.
