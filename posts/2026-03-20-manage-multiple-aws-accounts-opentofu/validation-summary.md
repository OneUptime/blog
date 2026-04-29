# Validation Summary: How to Manage Multiple AWS Accounts with Provider Aliases in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- AWS IAM AssumeRole
- AWS VPC peering
- HCL

## Sources Consulted
- OpenTofu: Providers Within Modules - https://opentofu.org/docs/language/modules/develop/providers/
- OpenTofu: Provider Configuration - https://opentofu.org/docs/language/providers/configuration/
- OpenTofu: Provider Requirements - https://opentofu.org/docs/language/providers/requirements/
- AWS provider docs overview - https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS provider: `aws_vpc_peering_connection` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection
- AWS provider: `aws_vpc_peering_connection_accepter` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_peering_connection_accepter
- AWS documentation: Accept or reject a VPC peering connection - https://docs.aws.amazon.com/vpc/latest/peering/accept-vpc-peering-connection.html

## Issues Found
- The child-module example declared `configuration_aliases = [aws]`, but the module only receives the default `aws` provider name from the caller through `providers = { aws = aws.production }` / `providers = { aws = aws.staging }`. OpenTofu uses `configuration_aliases` for additional named configurations such as `aws.src` and `aws.dst`, so I removed that line.
- The note claiming that dynamic provider creation with `for_each` is not natively supported was outdated for OpenTofu. OpenTofu supports `for_each` on aliased provider configurations, so I corrected the note and preserved the remaining caveat that individual provider instances still need to be selected explicitly when bound to resources or passed to modules.

## Review Notes
- The module example still pins `hashicorp/aws` to `~> 5.0`. That is valid for the patterns shown, but it constrains the example to AWS provider v5.x behavior.
- The workspace did not have the `tofu` CLI installed, so I could not run `tofu validate` locally. Validation was done against the official language and provider documentation listed above.
