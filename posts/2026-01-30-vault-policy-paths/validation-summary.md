# Validation Summary: How to Build Vault Policy Paths

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- HashiCorp Vault (policy language, ACL policies)
- HCL (HashiCorp Configuration Language)
- Vault KV v2 secret engine
- Vault transit, database, and auth/token endpoints
- Vault identity templating
- Vault namespaces (Enterprise feature)

## Sources Consulted
- HashiCorp Vault policies concept docs: https://developer.hashicorp.com/vault/docs/concepts/policies
- HashiCorp Vault policy syntax (capabilities, parameter constraints): https://developer.hashicorp.com/vault/docs/concepts/policies#policy-syntax
- HashiCorp Vault ACL policy path templating: https://developer.hashicorp.com/vault/docs/concepts/policies#templated-policies
- HashiCorp Vault identity templates reference: https://developer.hashicorp.com/vault/docs/concepts/policies#parameters-with-identity-templates
- HashiCorp Vault tutorial on policies and templating: https://developer.hashicorp.com/vault/tutorials/policies
- HashiCorp Vault KV v2 API: https://developer.hashicorp.com/vault/api-docs/secret/kv/kv-v2
- HashiCorp Vault database secrets engine API: https://developer.hashicorp.com/vault/api-docs/secret/databases
- HashiCorp Vault token auth API (`auth/token/create`, `auth/token/create-orphan`): https://developer.hashicorp.com/vault/api-docs/auth/token

## Issues Found

1. **Glob pattern descriptions for `*` and `+` were swapped.**
   In the "Glob Pattern Types" code block, the article stated that `*` matches within a single path segment and `+` matches across multiple segments. The Vault documentation defines the opposite:
   - `*` is an end-of-path wildcard that matches any number of characters, including additional path segments, and is only valid as the last character of a path.
   - `+` matches any number of characters within a single path segment.

   Fixed the comments (and the example "Matches/Does NOT match" lines) so each glob is described correctly. The actual path examples elsewhere in the article already used `*` and `+` correctly, so only the explanatory comments needed updating.

2. **Invalid nested `allowed_parameters` / `denied_parameters` syntax wrapping a `data` key.**
   The "Parameter Restrictions", "Combining Allowed and Denied Parameters", and "Complete Application Policy" sections all used:
   ```
   allowed_parameters = {
     "data" = {
       "username" = []
       ...
     }
   }
   ```
   Vault's `allowed_parameters` and `denied_parameters` are flat `map[string][]string` (or `[]interface{}`) — keys must be top-level request parameter names and values must be a list of allowed strings (`[]` meaning "any value"). A nested object as the value is not a valid HCL structure for these fields and will fail policy parsing. Additionally, `allowed_parameters` operates only on top-level request body / query parameters, so it cannot restrict individual fields *inside* the KV v2 `data` object.

   Fixed by rewriting these examples to use paths where the parameter restriction is meaningful and the names are real top-level API parameters:
   - First example switched from `secret/data/production/database` to `database/config/production-db` with real database config parameters (`plugin_name`, `connection_url`, `username`, `password`, `allowed_roles`).
   - The "deny sensitive parameters" example was retargeted to `auth/token/create` with real token parameters (`no_default_policy`, `no_parent`).
   - The "Combining Allowed and Denied Parameters" example was changed to `database/roles/my-role` with real role parameters (`db_name`, `default_ttl`, `max_ttl`, `creation_statements`).

3. **`allowed_parameters` block applied to a `read`-only capability.**
   In the "Complete Application Policy", the `secret/data/production/payment-service/credentials/*` block was declared with `capabilities = ["read"]` but also included an `allowed_parameters` map that aimed to restrict fields inside `data`. Read operations on KV v2 don't accept a request body of writable fields — the restriction had no effect, and the nested syntax was also invalid (same issue as #2). Removed the invalid `allowed_parameters` block, leaving the read-only path intact.

## Review Notes

- The `+/secret/data/...` and `{{identity.entity.aliases.auth_ldap_12345.metadata.namespace}}/secret/data/*` patterns in the "Namespace-Aware Policy" example are presented as illustrative. In Vault Enterprise, namespaces are typically targeted via the `X-Vault-Namespace` header or the `VAULT_NAMESPACE` env var rather than encoded as a prefix in the policy path; cross-namespace policy templating is a power-user pattern and depends on namespace configuration. Left as-is since the section is clearly framed as an Enterprise multi-tenant illustration.
- The `{{identity.groups.names}}` template inside `secret/data/teams/{{identity.groups.names}}/*` produces a list of group names rather than a single string. In practice, identity templating for paths usually references a specific group via `identity.groups.ids.<id>.name` (or vice versa) or uses entity metadata that has been pre-populated from group membership. The example will still parse, but users adapting it should be aware it does not iterate over all group memberships the way the surrounding prose implies. Did not modify since it is presented as a conceptual pattern and the surrounding examples (entity metadata templates) demonstrate the working approach.
- The capabilities table omits the `patch` capability (added in Vault 1.9). Not technically incorrect since the table is described as "the following capabilities" rather than an exhaustive list, but worth noting for completeness if the post is revised.
- HTTP method mapping in the capabilities table treats `list` as `LIST`; Vault internally uses either the `LIST` HTTP method or `GET` with `?list=true`. The simplified "LIST" notation is consistent with HashiCorp's own documentation, so this is acceptable shorthand.
