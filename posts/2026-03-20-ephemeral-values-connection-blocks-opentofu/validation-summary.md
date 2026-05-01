# Validation Summary: How to Use Ephemeral Values in Connection Blocks in OpenTofu - Opentofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- HCL
- OpenTofu provisioners and connection blocks
- `terraform_data`
- AWS EC2 and AWS Secrets Manager
- HashiCorp Vault KV v2
- HashiCorp TLS provider
- SSH
- WinRM

## Sources Consulted
- OpenTofu Ephemeral resources: https://opentofu.org/docs/v1.11/language/ephemerality/ephemeral-resources/
- OpenTofu Provisioner Connection Settings: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu Input Variables: https://opentofu.org/docs/language/values/variables/
- OpenTofu `uuid` Function: https://opentofu.org/docs/language/functions/uuid/
- OpenTofu Provisioners Without a Resource: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- OpenTofu remote-exec Provisioner: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- HashiCorp TLS provider ephemeral `tls_private_key` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-tls/main/docs/ephemeral-resources/private_key.md
- HashiCorp TLS provider v4.1.0 release notes: https://github.com/hashicorp/terraform-provider-tls/releases/tag/v4.1.0
- HashiCorp AWS provider ephemeral `aws_secretsmanager_secret_version` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/ephemeral-resources/secretsmanager_secret_version.html.markdown
- HashiCorp Vault provider ephemeral `vault_kv_secret_v2` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-vault/main/website/docs/ephemeral-resources/kv_secret_v2.html.md
- HashiCorp Vault provider v5.0.0 release notes: https://github.com/hashicorp/terraform-provider-vault/releases/tag/v5.0.0

## Issues Found
- The original "Basic Ephemeral SSH Key" example used `ephemeral.tls_private_key.*` values in `aws_key_pair.public_key`. OpenTofu only allows ephemeral values in ephemeral contexts such as provisioners, connection blocks, providers, locals, ephemeral resources, ephemeral variables/outputs, and write-only attributes. I replaced that example with an ephemeral private-key input variable used only in the `connection` block, while keeping the public key non-ephemeral.
- The original "Dynamic SSH Key Generation per Deployment" example had the same invalid pattern by assigning `ephemeral.tls_private_key.deploy.public_key_openssh` to `aws_key_pair.public_key`. I rewrote it to use deployment-specific key pair registration with an ephemeral private-key input variable instead of an ephemeral TLS resource output in a normal resource argument.
- The original lifecycle comment in the deployment example said `create_before_destroy` would "Clean up key pair after deployment". That is incorrect. `create_before_destroy` controls replacement order; it does not perform post-deployment cleanup. I corrected the comment to describe the actual behavior.
- The original deployment example used `uuid()` as the `terraform_data` input, which would produce a new value on each evaluation rather than representing a stable deployment identifier supplied by the caller. I changed it to `var.deployment_id`.
- The final section was labeled as a "Null Resource" example even though the code used `terraform_data`, which is the current OpenTofu pattern for provisioners without a directly associated managed resource. I corrected the section title.
- The post did not mention the core version requirement for ephemeral resources. I updated the introduction to note that these examples require OpenTofu v1.11+.
- Several descriptions said ephemeral credentials were kept out of "state" only. OpenTofu documentation states ephemeral values are excluded from both state and plan, so I corrected that wording.
- The post did not mention that inherited resource-level `connection` blocks do not automatically trigger provisioner log suppression. I added that caveat to the conclusion because it affects safe use of these examples.

## Review Notes
- The post is technically valid after the fixes above.
- These examples depend on provider support for ephemeral resources in addition to OpenTofu support. In practice, the exact provider version must include the relevant ephemeral resource types such as `tls_private_key`, `vault_kv_secret_v2`, and `aws_secretsmanager_secret_version`.
- Root-module ephemeral variables have additional handling constraints around `tofu apply -var` and `-var-file`, as noted in the OpenTofu variable documentation.
