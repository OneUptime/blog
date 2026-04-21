# Validation Summary: How to Manage SSH Keys with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- Terraform/OpenTofu TLS provider
- Terraform/OpenTofu AWS provider
- AWS EC2 key pairs
- AWS Secrets Manager
- OpenTofu state and state encryption
- OpenTofu provisioners and SSH connection settings

## Sources Consulted
- OpenTofu sensitive data in state documentation: https://opentofu.org/docs/language/state/sensitive-data/
- OpenTofu state and plan encryption documentation: https://opentofu.org/docs/v1.7/language/state/encryption/
- OpenTofu `terraform_data` resource documentation: https://opentofu.org/docs/language/resources/tf-data/
- OpenTofu lifecycle meta-argument documentation: https://opentofu.org/docs/language/meta-arguments/lifecycle/
- OpenTofu remote-exec provisioner documentation: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu provisioner connection settings documentation: https://opentofu.org/docs/language/resources/provisioners/connection/
- AWS EC2 key pair documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html
- TLS provider `tls_private_key` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-tls/main/docs/resources/private_key.md
- AWS provider `aws_key_pair` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/key_pair.html.markdown
- AWS provider `aws_secretsmanager_secret_version` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/secretsmanager_secret_version.html.markdown
- AWS provider `aws_secretsmanager_secret_version` data source documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/secretsmanager_secret_version.html.markdown
- AWS provider `aws_instance` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/instance.html.markdown
- AWS provider `aws_launch_template` resource documentation source: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/launch_template.html.markdown

## Issues Found
- The post used ECDSA P256 as an EC2 key pair example and recommended it over RSA. AWS EC2 key pairs support RSA and ED25519, with ED25519 supported for Linux instances only. I replaced the ECDSA section with an ED25519 example and noted the Linux/Windows distinction.
- The rotation example changed only `aws_key_pair.key_name`; the `tls_private_key` resource would have kept the same private/public key material. I added a `terraform_data` trigger and `replace_triggered_by` lifecycle rule so incrementing `key_version` actually replaces the generated key.
- The conclusion said private key material should be stored exclusively in Secrets Manager and never in OpenTofu state. The TLS provider documents that `tls_private_key` stores private keys in state, and the AWS provider resources/data sources expose secret strings to state. I corrected the state-security guidance throughout the post.
- The post said incrementing `key_version` triggers an Auto Scaling Group instance refresh. The snippet only updates a launch template key name and does not define an ASG refresh. I changed the conclusion to say the new launch template version must be rolled out with an instance refresh.

## Review Notes
The remaining HCL snippets use documented provider arguments and OpenTofu provisioner connection fields. The local environment does not have `tofu` or `terraform` installed, so validation was performed against official documentation rather than by running `tofu validate`.
