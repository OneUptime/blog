# Validation Summary: How to Use the provider Meta-Argument in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu language meta-arguments
- OpenTofu provider configuration and module provider mappings
- AWS provider aliases for multi-region and multi-account usage
- AWS EC2 AMI selection via Systems Manager Parameter Store
- AWS Certificate Manager (ACM) and CloudFront regional certificate requirements

## Sources Consulted
- OpenTofu Docs: The Resource `provider` Meta-Argument — https://opentofu.org/docs/language/meta-arguments/resource-provider/
- OpenTofu Docs: Provider Configuration — https://opentofu.org/docs/language/providers/configuration/
- OpenTofu Docs: The Module `providers` Meta-Argument — https://opentofu.org/docs/language/meta-arguments/module-providers/
- OpenTofu Docs: Provider Requirements — https://opentofu.org/docs/language/providers/requirements/
- Terraform Registry: hashicorp/aws provider latest release page — https://registry.terraform.io/providers/hashicorp/aws/latest
- Terraform Registry: `aws_ssm_parameter` data source — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- AWS Systems Manager User Guide: Calling AMI public parameters in Parameter Store — https://docs.aws.amazon.com/systems-manager/latest/userguide/parameter-store-public-parameters-ami.html
- Amazon CloudFront Developer Guide: Requirements for using SSL/TLS certificates with CloudFront — https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- AWS Certificate Manager User Guide: What is AWS Certificate Manager? — https://docs.aws.amazon.com/acm/latest/userguide/acm-overview.html

## Issues Found
1. **AWS provider version pin was outdated.** The post pinned `hashicorp/aws` to `~> 5.0`, while the current major release is 6.x. Updated the example to `~> 6.0` so the provider requirement reflects the current supported major line.

2. **The EC2 examples used hard-coded AMI IDs.** AMI IDs are region-specific and time-sensitive, which makes static IDs fragile in a multi-region tutorial. Replaced the hard-coded AMIs with `aws_ssm_parameter` lookups against AWS public Amazon Linux 2023 parameters, using aliased providers on the data sources so each region resolves its own current AMI.

3. **The Route53/ACM section was mislabeled and the explanation was imprecise.** The example was actually demonstrating the ACM requirement for CloudFront, not a Route53-specific regional behavior. Renamed the section to focus on ACM for CloudFront and corrected the note to state that CloudFront-related ACM certificates must be created in `us-east-1`.

4. **The post text described the meta-argument too narrowly after the AMI fix.** OpenTofu supports the `provider` meta-argument on both resource and data blocks. Updated the description, introduction, and conclusion to reflect that scope accurately.

## Review Notes
- The module examples are correct as written because they remap the child module's default `aws` provider. If a child module references an aliased provider configuration internally, it must declare `configuration_aliases` in its own `required_providers` block.
- The ACM example correctly demonstrates provider selection for CloudFront certificates, but a complete DNS validation flow would also include Route53 validation records and an `aws_acm_certificate_validation` resource.
- The S3 bucket example is syntactically correct, but real bucket names must be globally unique in AWS.
