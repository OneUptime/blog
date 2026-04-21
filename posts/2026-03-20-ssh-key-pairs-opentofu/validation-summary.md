# Validation Summary: How to Manage SSH Key Pairs with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS EC2 key pairs
- AWS provider for OpenTofu/Terraform
- TLS provider
- Local provider
- AWS Secrets Manager
- AWS CLI
- SSH/OpenSSH

## Sources Consulted
- OpenTofu `file` function documentation: https://opentofu.org/docs/language/functions/file/
- OpenTofu `pathexpand` function documentation: https://opentofu.org/docs/language/functions/pathexpand/
- OpenTofu state and plan encryption documentation: https://opentofu.org/docs/language/state/encryption/
- AWS EC2 key pairs documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
- AWS EC2 create/import key pair documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/create-key-pairs.html
- AWS provider `aws_key_pair` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/key_pair
- AWS provider `aws_instance` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_secretsmanager_secret` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret
- AWS provider `aws_secretsmanager_secret_version` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/secretsmanager_secret_version
- TLS provider `tls_private_key` resource documentation: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- Local provider `local_sensitive_file` resource documentation: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/sensitive_file
- AWS CLI `secretsmanager get-secret-value` command reference: https://docs.aws.amazon.com/cli/latest/reference/secretsmanager/get-secret-value.html

## Issues Found
- The existing-public-key example used `file("~/.ssh/id_rsa.pub")`. OpenTofu does not treat quoted `~` paths like a shell; `pathexpand()` is the documented function for expanding a leading `~`. Changed it to `file(pathexpand("~/.ssh/id_rsa.pub"))`.
- The generated-key sections implied that storing the private key in Secrets Manager was sufficient for secure handling. The TLS provider documentation warns that generated private keys are stored in state. Updated the generation, storage, and conclusion text to call out state protection/encryption and to avoid this pattern for production key material.
- The `local_sensitive_file` example used the Local provider, but the provider list only declared AWS and TLS. Added `local = { source = "hashicorp/local" }` to the `required_providers` block.
- The heading "Outputting the Key ARN" was inaccurate because the snippet outputs the key pair name and the Secrets Manager secret ARN. Changed it to "Outputting the Key Name and Secret ARN".

## Review Notes
The EC2 snippets assume surrounding configuration such as AWS provider credentials/region, `var.environment`, and `data.aws_ami.amazon_linux`. Those assumptions are common for focused OpenTofu examples and were left unchanged. The `chmod 600` command is acceptable for OpenSSH private key permissions, although AWS examples often use `chmod 400`.
