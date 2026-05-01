# Validation Summary: How to Use Ephemeral Values in Connection Blocks in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- Provisioners
- `connection` blocks
- SSH
- WinRM
- AWS Secrets Manager
- AWS Systems Manager Parameter Store

## Sources Consulted
- OpenTofu provisioner connection docs: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu ephemerality docs: https://opentofu.org/docs/language/ephemerality/
- OpenTofu 1.11 "What's new" docs: https://opentofu.org/docs/v1.11/intro/whats-new/
- OpenTofu provisioners without a resource (`terraform_data`) docs: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- AWS provider ephemeral `aws_secretsmanager_secret_version` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/secretsmanager_secret_version
- AWS provider ephemeral `aws_ssm_parameter` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/ephemeral-resources/ssm_parameter
- TLS provider ephemeral `tls_private_key` docs: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/ephemeral-resources/private_key
- OpenTofu SSH communicator source, which validates that `certificate` expects an SSH certificate rather than a plain public key: https://github.com/opentofu/opentofu/blob/main/internal/communicator/ssh/provisioner.go

## Issues Found
- The introduction implied connection blocks are a fully safe place for secrets because ephemeral values are not stored in state. OpenTofu docs are narrower: ephemeral values are not stored in plan or state, but provisioner logs can still expose connection values. I corrected the introduction, state section, and summary to match the documented behavior.
- The post did not mention the OpenTofu version requirement for ephemeral resources and related ephemeral-value workflows. OpenTofu documents these capabilities in the 1.11 feature set, so I updated the post to say "OpenTofu 1.11 and later."
- The WinRM section omitted the current status of WinRM support. OpenTofu now documents WinRM as deprecated in v1.12 and planned for removal in v1.13. I added that note directly above the WinRM example.
- The "Certificate-Based Authentication" example referenced `ephemeral.tls_private_key.client.private_key_pem` without declaring a matching ephemeral resource, and it paired a generated private key with a separately fetched certificate, which would not reliably match. I corrected the example to show SSH certificate authentication with both the certificate and its matching private key fetched ephemerally from Secrets Manager, and I renamed the section accordingly.
- The `aws_ssm_parameter` ephemeral resource example used `name`, but the provider documentation requires the `arn` argument. I fixed the snippet to use an ARN.
- The state table claimed non-secret connection attributes such as `host` and `user` are stored in state. The OpenTofu docs explicitly guarantee only that ephemeral values are not stored in plan or state, and they warn about log exposure instead. I removed the unsupported storage claims and limited the section to the documented guarantees.

## Review Notes
- The `null_resource` examples remain valid, but current OpenTofu documentation recommends `terraform_data` as the built-in resource for provisioner-only workflows.
- The AWS examples rely on provider releases that implement the documented ephemeral resources. Older AWS provider versions will not support these blocks even on a new enough OpenTofu release.
- The examples are partial snippets and do not include provider configuration, IAM policy, networking, or live cloud resources, so I did not run `tofu validate` or execute them end-to-end in this environment.
