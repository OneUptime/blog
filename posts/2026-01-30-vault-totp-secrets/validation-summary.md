# Validation Summary: How to Implement Vault TOTP Secrets

## Status
validated

## Post Type
Tutorial / Implementation Guide

## Technologies Covered
- HashiCorp Vault (TOTP secrets engine)
- TOTP (RFC 6238)
- Vault CLI (`vault secrets enable`, `vault write`, `vault read`, `vault list`, `vault delete`, `vault policy write`, `vault token create`)
- hvac (Python Vault client library)
- HashiCorp Vault Go API client (`github.com/hashicorp/vault/api`)
- HCL (Vault policy language)
- Bash scripting and `qrencode`
- `otpauth://` URI scheme (Google Authenticator key URI format)

## Sources Consulted
- HashiCorp Vault TOTP API docs: https://developer.hashicorp.com/vault/api-docs/secret/totp
- HashiCorp Vault TOTP secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/totp
- pquerna/otp Go library (used internally by Vault): https://github.com/pquerna/otp
- RFC 6238 (TOTP standard)
- hvac Python library docs (Totp class: `create_key`, `validate_code`, etc.)
- HashiCorp Vault Go client docs (`Logical().WriteWithContext`, `ReadWithContext`)
- Google Authenticator Key URI Format spec

## Issues Found
**Section 7 ("Handle Clock Drift") — incorrect description of `skew=1` behavior.**

- What was wrong: The post claimed `skew=1` only accepted the current and previous period codes, and the mermaid diagram showed the next period as "Invalid / Code Rejected".
- Why it was wrong: Vault's TOTP engine uses pquerna/otp internally, whose `ValidateCustom` checks both `counter+i` and `counter-i` for `i := 1; i <= Skew`. The official Vault doc string also says: "Value of 1 allows up to Period of either side of the specified time." So `skew=1` accepts ±1 period (previous, current, AND next) — three windows, not two. This is also what RFC 6238 §5.2 recommends.
- Fix applied: Updated the mermaid diagram so the next period is now styled green and labeled "Valid", and rewrote the bullet list and surrounding prose to clarify that `skew=1` accepts codes from one period on either side (clients running behind OR ahead).

## Review Notes
- The parameter table for `skew` correctly lists "0, 1" as the only allowed values — matches the Vault API docs.
- The hvac method signatures used (`client.secrets.totp.create_key(...)` and `client.secrets.totp.validate_code(...)`) are accurate.
- The Vault response shape for both code generation (`data.code`) and validation (`data.valid`) matches the official API.
- The HCL policy block visually combines two separate policy files (`totp-admin.hcl` and `totp-validator.hcl`) inside a single code fence. Comments delimit them, which is acceptable, but a reader skimming could miss it. Not a technical error.
- The comment `# create = write for validation` in the validator policy is reasonable shorthand. The TOTP validate-code endpoint registers handlers for both `CreateOperation` and `UpdateOperation` in Vault's TOTP backend, so granting `create` works in practice. Granting `update` would also work; pairing both is the safest belt-and-braces choice but not required.
- Many authenticator apps (notably older Google Authenticator versions) ignore non-default `algorithm`, `digits`, and `period` parameters from the otpauth URL even when present. The post already calls this out — good.
- The `barcode` field is a base64-encoded PNG image (a data URL prefix like `data:image/png;base64,` is NOT included by Vault — the client has to add it before rendering in HTML). Worth noting but not strictly incorrect.
