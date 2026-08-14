# Validation Summary: Test Terraform Data Sources With Mocks and Overrides

## Status

validated

## Post Type

Technical guide / tutorial

## Technologies Covered

- Terraform test framework and `.tftest.hcl` files
- Terraform mock providers
- Terraform data source, resource, and module overrides
- Terraform provider schemas and computed attributes
- HashiCorp Configuration Language (HCL)
- HashiCorp AWS provider
- AWS VPC, subnet, KMS, IAM, S3, and provider identity/region data

## Sources Consulted

- [Terraform provider mocking and override documentation](https://developer.hashicorp.com/terraform/language/tests/mocking)
- [Terraform test language and provider mapping](https://developer.hashicorp.com/terraform/language/tests)
- [Terraform data source planning behavior](https://developer.hashicorp.com/terraform/language/data-sources#data-source-behavior)
- [Terraform 1.7 changelog introducing mocks and overrides](https://github.com/hashicorp/terraform/blob/v1.7.0/CHANGELOG.md)
- [Terraform 1.11 changelog introducing `override_during`](https://github.com/hashicorp/terraform/blob/v1.11.0/CHANGELOG.md)
- [Terraform `test` command reference](https://developer.hashicorp.com/terraform/cli/commands/test)
- [Terraform Plugin Framework schema documentation](https://developer.hashicorp.com/terraform/plugin/framework/handling-data/schemas)
- [AWS provider `aws_vpc` data source](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/vpc)
- [AWS provider `aws_subnets` data source](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/subnets)
- [AWS provider `aws_region` data source](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/region)
- [AWS provider `aws_caller_identity` data source](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/caller_identity)
- [AWS provider `aws_security_group` resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group)
- [AWS provider `aws_kms_key` resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/kms_key)
- [AWS provider `aws_iam_policy` resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy)
- [AWS VPC and subnet identifier examples](https://docs.aws.amazon.com/vpc/latest/userguide/getting-started-with-amazon-vpc-using-the-aws-cli.html)
- [AWS KMS key ID and ARN examples](https://docs.aws.amazon.com/kms/latest/developerguide/create-symmetric-cmk.html)

## Issues Found

- The post treated `override_during` as if it were available across the stated Terraform 1.7+ baseline. Basic mocking and override blocks were introduced in Terraform 1.7, but `override_during` was introduced in Terraform 1.11. The plan-time section and debugging checklist now state the Terraform 1.11 requirement.
- The original plan-time example used an overridden `aws_caller_identity` data source. Because that data source has no unknown arguments or dependencies, Terraform reads it during planning and its overridden values are already plan-known without `override_during`. The example now uses a provider-computed KMS resource attribute consumed by an IAM policy, which correctly demonstrates a managed-resource value made available during planning.
- The generated-value explanation applied managed-resource apply-time behavior too broadly to data sources. It now distinguishes newly created managed resources from data sources, which Terraform normally reads during planning when their arguments and dependencies are known.
- The current AWS provider 6.55.0 marks the `name` attribute of the `aws_region` data source as deprecated in favor of `region`. Both region override fixtures now use `region`.
- Several fixtures were described as realistic but used identifiers that did not match AWS formats (`vpc-test0001`, `subnet-test0001`, and `test-key`). They were replaced with long-form VPC/subnet IDs and a UUID-shaped KMS key ID and ARN based on AWS documentation.
- The VPC example said the module used the discovered CIDR, but the shown resource and assertion use the VPC ID. The description now says the module uses the ID.
- The run-level precedence statement was too broad. It now specifies that a run-level override wins when the file and run scopes override the same target address.
- The required-argument explanation mixed required and optional schema cases. It now states directly that arguments marked required by the provider schema still require valid configuration.

## Review Notes

The corrected examples were validated with Terraform 1.15.8 and HashiCorp AWS provider 6.55.0. Temporary API-free tests covered data source overrides, nested module targets, module output overrides, provider-computed resource overrides, plan-time resource values, same-target scope precedence, and indexed resource-instance targets; all passed. The mixed real/mock provider mapping and `terraform test -verbose` flag also match current official syntax. No real-provider apply was executed because that integration example is intentionally capable of creating infrastructure.
