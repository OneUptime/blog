# Validation Summary: How to Use Ephemeral Variables in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- HashiCorp Vault provider
- AWS provider
- Infrastructure as Code

## Sources Consulted
- OpenTofu input variables documentation: https://opentofu.org/docs/language/values/variables/
- OpenTofu ephemerality documentation: https://opentofu.org/docs/language/ephemerality/
- OpenTofu output values documentation: https://opentofu.org/docs/language/values/outputs/
- OpenTofu `apply` command documentation: https://opentofu.org/docs/v1.11/cli/commands/apply/
- OpenTofu 1.11 feature summary: https://opentofu.org/docs/intro/whats-new/
- HashiCorp Vault provider documentation source (`auth_login` / AppRole example): https://github.com/hashicorp/terraform-provider-vault/blob/main/website/docs/index.html.markdown
- Vault AppRole login API documentation: https://developer.hashicorp.com/vault/api-docs/auth/approle
- HashiCorp AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The Vault provider example used `auth_login_approle`, which is not a documented provider configuration block in the current Vault provider. I changed it to the supported generic `auth_login` block with `path = "auth/approle/login"` and a `parameters` map containing `role_id` and `secret_id`.
- The post repeatedly described ephemeral values as not being stored only in state files. OpenTofu 1.11 documents ephemeral values as not being stored in state or plan files, while sensitive values are still stored in both. I updated the description, explanation, inline comments, and conclusion to reflect that behavior accurately.
- The limitations section implied that outputs can generally use ephemeral values if the output is also ephemeral. OpenTofu allows `ephemeral = true` only on child module outputs, not root module outputs. I clarified the limitation text accordingly.

## Review Notes
- Root-module ephemeral variables must be provided again when applying a saved plan file, because OpenTofu does not persist their values in the plan.
- The `aws_instance` provisioner example is illustrative rather than fully runnable as-is; a real deployment still needs a valid region-specific AMI and reachable SSH networking.
