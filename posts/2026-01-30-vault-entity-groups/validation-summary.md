# Validation Summary: How to Implement Vault Entity Groups

## Status
validated

## Post Type
Tutorial / Practical Guide

## Technologies Covered
- HashiCorp Vault (identity secrets engine)
- Vault CLI (`vault` binary)
- Vault HTTP API (`/v1/identity/*` endpoints)
- LDAP auth method
- OIDC auth method
- AppRole auth method
- Vault HCL policy language and identity templating
- `jq` for JSON parsing in shell examples

## Sources Consulted
- Vault Identity secrets engine docs: https://developer.hashicorp.com/vault/docs/secrets/identity
- Identity groups concepts: https://developer.hashicorp.com/vault/docs/concepts/identity
- Identity group API reference: https://developer.hashicorp.com/vault/api-docs/secret/identity/group
- Identity group-alias API reference: https://developer.hashicorp.com/vault/api-docs/secret/identity/group-alias
- Identity entity API reference: https://developer.hashicorp.com/vault/api-docs/secret/identity/entity
- Identity entity-alias API reference: https://developer.hashicorp.com/vault/api-docs/secret/identity/entity-alias
- ACL policy templating: https://developer.hashicorp.com/vault/docs/concepts/policies#templated-policies
- LDAP auth method docs: https://developer.hashicorp.com/vault/docs/auth/ldap
- LDAP auth API: https://developer.hashicorp.com/vault/api-docs/auth/ldap
- `vault token capabilities` / `vault token lookup` CLI reference

## Issues Found
No technical issues found. All endpoints (`identity/entity`, `identity/entity-alias`, `identity/group`, `identity/group-alias`, `identity/group/name/<name>`, `identity/group/id/<id>`), parameter names (`type`, `policies`, `member_entity_ids`, `member_group_ids`, `canonical_id`, `mount_accessor`, `metadata`), LDAP config fields (`url`, `userdn`, `groupdn`, `groupattr`, `userattr`, `insecure_tls`, `starttls`), CLI syntax, HTTP API payloads, identity template expressions (`{{identity.groups.names.<name>.metadata.<key>}}`), and conceptual claims (external groups cannot have `member_entity_ids`; child group members inherit parent policies; Vault prevents circular group references) match the official Vault documentation.

## Review Notes
- The example response payload for `POST identity/entity` includes a `name` field for illustrative clarity; in practice the live Vault API typically returns only `id` and `aliases` in the create response, but the surrounding text correctly emphasizes capturing the `id`, so the example is not misleading.
- Real auth method accessors look like `auth_ldap_3e5b9f12` (a hash suffix). The post uses readable placeholders like `auth_ldap_abc123def` and `auth_oidc_xyz789`, which is fine for documentation.
- Combining `ldaps://` URL with `starttls=true` in the LDAP config example is unusual (LDAPS is implicit TLS on port 636; StartTLS is for plaintext-to-TLS upgrade on port 389). Both fields are individually valid; readers customizing the example should pick one based on their LDAP server. Not corrected because the snippet is explicitly labeled "adjust for your LDAP server."
- The advice to keep nested group hierarchies shallow (2-3 levels) is a reasonable operational guideline rather than a hard Vault limit.
