# Validation Summary: How to Manage Vault Policies with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HashiCorp Vault ACL policies
- HashiCorp Vault auth methods
- HCL policy definitions
- HashiCorp Vault provider resources for OpenTofu

## Sources Consulted
- Vault Policy Concepts — https://developer.hashicorp.com/vault/docs/concepts/policies
- Vault KV Secrets Engine Docs — https://developer.hashicorp.com/vault/docs/secrets/kv
- Vault Policies Tutorial — https://developer.hashicorp.com/vault/tutorials/policies/policies
- OpenTofu `file()` Function — https://opentofu.org/docs/language/functions/file/
- OpenTofu `templatefile()` Function — https://opentofu.org/docs/language/functions/templatefile/
- OpenTofu `for_each` Meta-Argument — https://opentofu.org/docs/language/meta-arguments/for_each/
- Vault Provider `vault_policy` Resource — https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/policy.html.md
- Vault Provider `vault_audit` Resource — https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/audit.html.md
- Vault Provider `vault_kubernetes_auth_backend_role` Resource — https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/kubernetes_auth_backend_role.html.md
- Vault Provider `vault_approle_auth_backend_role` Resource — https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/r/approle_auth_backend_role.html.md

## Issues Found

1. **KV v2 list paths were incorrect in multiple policy examples.** The post granted `list` on `secret/data/...` paths, but Vault KV v2 uses `secret/metadata/...` for list operations. I split the examples so secret reads stay on `data/` paths and list permissions move to `metadata/` paths.

2. **The platform team example used incomplete paths for auth and ACL policy administration.** `auth/*` covers auth method endpoints, but enabling, disabling, tuning, and listing auth methods use `sys/auth/*` and `sys/auth`. ACL policies are managed under `sys/policies/acl` and `sys/policies/acl/*`. I updated that example to use the documented paths.

3. **The introduction overstated policy syntax support.** Vault ACL policies can be written in HCL or JSON, not only HCL. I corrected the sentence.

## Review Notes
- The examples assume default mount paths such as `secret`, `database`, `aws`, `kubernetes`, and `approle`. If a Vault deployment uses custom mount paths, the policy paths and auth backend names need to be adjusted accordingly.
- The `.hcl.tpl` filename used with `templatefile()` is valid. OpenTofu commonly documents `.tftpl` as a naming convention, but the function does not require that extension.
