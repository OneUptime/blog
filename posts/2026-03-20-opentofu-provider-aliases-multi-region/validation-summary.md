# Validation Summary: How to Use Provider Aliases for Multi-Region Deployments in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (and Terraform-compatible HCL configuration language)
- AWS provider for OpenTofu/Terraform (`hashicorp/aws` / `opentofu/aws`)
- AWS multi-region resources (S3, VPC, AMI data sources)
- AWS IAM `AssumeRole` for multi-account deployments

## Sources Consulted
- OpenTofu documentation on Providers: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu documentation on Provider aliases (multiple provider configurations): https://opentofu.org/docs/language/providers/configuration/#alias-multiple-provider-configurations
- OpenTofu documentation on passing providers to modules: https://opentofu.org/docs/language/modules/develop/providers/
- Terraform AWS provider documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform AWS provider `assume_role` block: https://registry.terraform.io/providers/hashicorp/aws/latest/docs#assume_role-configuration-reference
- AWS region reference (ap-east-1 Hong Kong region): https://docs.aws.amazon.com/general/latest/gr/rande.html

## Issues Found
No technical issues found.

All code samples were verified against the OpenTofu language reference and the AWS provider documentation:

- The `alias` argument inside a `provider` block is the documented mechanism for declaring additional provider configurations.
- The `provider = aws.<alias>` meta-argument on resources and data sources is correct (single `provider`, in `<TYPE>.<ALIAS>` form, no quotes).
- The module-level `providers = { aws = aws.eu_west }` map (plural `providers`) is the correct way to pass aliased providers into a module, and `aws = aws` is a valid explicit default mapping.
- The `assume_role { role_arn = "..." }` nested block is a valid AWS provider configuration argument; the example ARNs use the standard `arn:aws:iam::<account>:role/<role-name>` format.
- AWS region identifiers used (`us-east-1`, `us-west-2`, `eu-west-1`, `ap-east-1`) are all valid AWS regions.
- The `aws_ami` data source filter using `amzn2-ami-hvm-*` with owner `amazon` and `most_recent = true` is a standard pattern.

## Review Notes
- The post focuses on the *consumer* side of aliased providers (using them in root configuration). For completeness in a follow-up post, the author may want to cover declaring `configuration_aliases` inside a child module's `required_providers` block — this is the official mechanism for a module to declare it accepts multiple aliased configurations of the same provider, and is recommended for modules that internally use more than one provider configuration.
- The `aws_ami` filter uses Amazon Linux 2 AMI naming (`amzn2-ami-hvm-*`). AL2 reaches end of standard support on 2026-06-30; readers building new infrastructure may prefer Amazon Linux 2023 (`al2023-ami-*`) going forward. This is not an error in the post, just a forward-looking note.
- No version pin is shown for the AWS provider; for production code, pinning via `required_providers` is recommended, but this is out of scope for a focused post on aliases.
