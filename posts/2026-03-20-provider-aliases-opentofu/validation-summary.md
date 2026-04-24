# Validation Summary: How to Use Provider Aliases in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform-compatible workflows
- AWS ACM
- AWS CloudFront
- Infrastructure as Code

## Sources Consulted
- OpenTofu Provider Configuration: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu Providers Within Modules: https://opentofu.org/docs/language/modules/develop/providers/
- OpenTofu Module `providers` Meta-Argument: https://opentofu.org/docs/language/meta-arguments/module-providers/
- OpenTofu Provider Requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu Data Sources: https://opentofu.org/docs/language/data-sources/
- AWS provider `aws_ami` data source docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/ami.html.markdown
- AWS provider `aws_region` data source docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/region.html.markdown
- AWS provider `aws_caller_identity` data source docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/caller_identity.html.markdown
- AWS provider `aws_acm_certificate` resource docs (official source): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/acm_certificate.html.markdown
- AWS CloudFront certificate region requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Canonical Ubuntu on AWS image naming and lookup guidance: https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/

## Issues Found
- The `aws_ami` example used a name filter of `ubuntu-22.04-*`, which does not match Canonical's documented AWS AMI naming pattern. I changed it to `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*` so the example aligns with official Ubuntu on AWS image names.
- The root-module example for `aws.us_east_1` passed an aliased provider to a child module without defining that aliased provider in the root module. I added the missing aliased `provider "aws"` block with `alias = "us_east_1"` and `region = "us-east-1"`.
- The "Checking Which Provider Is Used" section claimed `aws_caller_identity` could verify the provider in use, but the snippet only proved account identity and hardcoded the region strings. I updated the example to use both `aws_region` and `aws_caller_identity`, so it now verifies both the configured region and the AWS account for each provider configuration.
- The explanation around `configuration_aliases` implied that a module requires a caller to use a specific parent alias name. I tightened the wording so it reflects OpenTofu's actual behavior: the child module declares aliased provider configuration names internally, and the caller maps provider instances to those names via the `providers` argument.

## Review Notes
- No remaining technical issues found after the fixes.
- The article is still valid for current OpenTofu documentation. OpenTofu also supports `for_each` on aliased provider configurations for dynamic multi-instance patterns, but the post's narrower focus on static provider aliases remains accurate.
