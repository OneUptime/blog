# Validation Summary: How to Use the Time Provider in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp Time Provider
- HashiCorp Random Provider
- HashiCorp AWS Provider
- AWS IAM
- AWS Lambda

## Sources Consulted
- Terraform Registry: HashiCorp Time Provider documentation - https://registry.terraform.io/providers/hashicorp/time/latest/docs
- HashiCorp Time Provider source documentation for `time_static` - https://raw.githubusercontent.com/hashicorp/terraform-provider-time/main/docs/resources/static.md
- HashiCorp Time Provider source documentation for `time_offset` - https://raw.githubusercontent.com/hashicorp/terraform-provider-time/main/docs/resources/offset.md
- HashiCorp Time Provider source documentation for `time_rotating` - https://raw.githubusercontent.com/hashicorp/terraform-provider-time/main/docs/resources/rotating.md
- HashiCorp Time Provider source documentation for `time_sleep` - https://raw.githubusercontent.com/hashicorp/terraform-provider-time/main/docs/resources/sleep.md
- Terraform Registry API for HashiCorp Time Provider versions - https://registry.terraform.io/v1/providers/hashicorp/time/versions
- HashiCorp Random Provider documentation for `random_password` - https://raw.githubusercontent.com/hashicorp/terraform-provider-random/main/docs/resources/password.md
- HashiCorp AWS Provider documentation for `aws_lambda_function` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- AWS Lambda runtimes documentation - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform RFC3339 reference used by the provider docs - https://datatracker.ietf.org/doc/html/rfc3339#section-5.8

## Issues Found
- The provider setup pinned older provider major/minor lines (`hashicorp/time` `~> 0.11` and `hashicorp/aws` `~> 5.0`). Updated the example to current Registry release lines: `hashicorp/time` `~> 0.14` and `hashicorp/aws` `~> 6.0`.
- The `random_password` example used the Random provider without declaring it in `required_providers`. Added `hashicorp/random` with `~> 3.9` so the configuration explicitly pins every provider used in the examples.
- The `time_rotating` description could be read as an automatic background scheduler. Clarified that scheduled updates happen when Terraform is executed, matching the official provider documentation.
- The Lambda example used `python3.11`, which is still supported but uses the Amazon Linux 2 runtime family. Updated the generic example to `python3.12`, an Amazon Linux 2023 runtime shown in current AWS provider examples.

## Review Notes
- Terraform CLI was not installed in the local environment, so I could not run `terraform validate`. The HCL examples were reviewed manually against official provider schemas and documentation.
- `time_sleep` is correctly presented as a workaround for real propagation delays, which matches the provider documentation guidance.
