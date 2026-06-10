# Validation Summary: How to Create Vault Policy Templating

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Vault (policies, ACL templating)
- Vault Identity Secrets Engine (entities, entity aliases, groups, metadata)
- Vault KV Secrets Engine v2
- Vault auth methods (userpass, AppRole, Kubernetes)
- Vault CLI (`vault policy`, `vault write`, `vault read`, `vault auth list`, `vault token lookup`, `vault token capabilities`, `vault kv put`, `vault login`)
- HCL (HashiCorp Configuration Language)
- Terraform Vault provider (`vault_policy`, `vault_identity_entity`, `vault_identity_group`)
- Bash + jq

## Sources Consulted
- HashiCorp Vault: Templated Policies — https://developer.hashicorp.com/vault/docs/concepts/policies#templated-policies
- HashiCorp Vault: ACL Policies — https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault: Identity Secrets Engine — https://developer.hashicorp.com/vault/docs/secrets/identity
- HashiCorp Vault: Identity Entity API — https://developer.hashicorp.com/vault/api-docs/secret/identity/entity
- HashiCorp Vault: Identity Entity-Alias API — https://developer.hashicorp.com/vault/api-docs/secret/identity/entity-alias
- HashiCorp Vault: Identity Group API — https://developer.hashicorp.com/vault/api-docs/secret/identity/group
- HashiCorp Vault: KV v2 Secrets Engine — https://developer.hashicorp.com/vault/docs/secrets/kv/kv-v2
- HashiCorp Vault: Kubernetes Auth Method — https://developer.hashicorp.com/vault/docs/auth/kubernetes
- HashiCorp Vault CLI: token capabilities — https://developer.hashicorp.com/vault/docs/commands/token/capabilities
- Terraform Vault Provider docs — https://registry.terraform.io/providers/hashicorp/vault/latest/docs

## Issues Found
1. **Invalid wildcard in policy template variable (Pattern 3).** The original example used `{{identity.groups.ids.*.name}}`. Vault policy templating does not support wildcards in template parameters — only explicit group IDs or names (`identity.groups.ids.<group_id>.name`, `identity.groups.names.<group_name>.id`, `identity.groups.names.<group_name>.metadata.<key>`, etc.). Replaced the wildcard example with a valid pattern that references a specific group (`{{identity.groups.names.developers.metadata.project}}`) and added a sentence explaining that wildcards are not supported.

2. **Misleading comment in Use Case 2 (database credentials).** The comment "Only works if the entity has metadata write_access=true" implied that the policy itself enforced a conditional check on the `write_access` metadata, which it does not. Vault policies do not support conditional capabilities based on metadata values; access is gated by which policies are attached to the entity/group. Rewrote the comment to say the policy should only be attached to entities that should have write access.

3. **Incorrect terminology in Pattern 2.** The original comment said "You would only add this alias to admin entities," but the relevant action is attaching a *policy*, not adding an *alias* (aliases link auth-method identities to entities and are unrelated to policy assignment). Updated the comment to "Attach this policy only to entities that should have admin access."

## Review Notes
- Template variables in the "Available Template Variables" table are accurate and match the documented parameters.
- The KV v2 path conventions (`secret/data/...` for data, `secret/metadata/...` for metadata) and CLI behavior (`vault kv put secret/teams/...` automatically writing to `secret/data/teams/...`) are correctly described.
- Vault CLI metadata syntax (`metadata=key=value` repeated) is correct for `vault write identity/entity ...`.
- `vault token capabilities -token="s.xxxxx" <path>` works via the global `-token` flag (acting as that token against `sys/capabilities-self`). An alternative is the positional form `vault token capabilities s.xxxxx <path>` (which uses `sys/capabilities` and requires sudo). The example is functional; readers may want to be aware of the distinction.
- The legacy `s.` token prefix is shown in one example. Vault 1.10+ uses `hvs.` for service tokens by default, but `s.`-prefixed tokens still exist on older installations and the example is illustrative only.
- The Kubernetes auth alias metadata keys (`service_account_namespace`, `service_account_name`) used in Use Case 3 are correct.
- Terraform resources (`vault_policy`, `vault_identity_entity`, `vault_identity_group`) and their argument names are correct for the current `hashicorp/vault` provider.
