# Validation Summary: How to Configure Multiple AWS Regions in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS provider (`hashicorp/aws`)
- AWS services: VPC, ACM, CloudFront, S3 (replication), EC2 (AMI lookup), IAM
- Terraform/OpenTofu provider aliases and module provider passing

## Sources Consulted
- OpenTofu provider configuration docs: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu module providers docs: https://opentofu.org/docs/language/modules/develop/providers/
- Terraform AWS provider — `aws_acm_certificate`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate
- Terraform AWS provider — `aws_cloudfront_distribution`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudfront_distribution
- Terraform AWS provider — `aws_s3_bucket_replication_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- Terraform AWS provider — `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS docs — CloudFront requires ACM certificates in us-east-1: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Canonical Ubuntu AMI Locator (owner ID `099720109477` and naming pattern `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*`): https://cloud-images.ubuntu.com/locator/ec2/

## Issues Found
- **Ubuntu AMI filter pattern was incorrect.** In the "Data Sources Across Regions" section, both `data "aws_ami"` blocks filtered on `name = "ubuntu-22.04-*"`. Canonical's official Ubuntu AMIs are not named that way; the actual pattern is `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*`. As written, the data source would return no results and the example would fail at plan/apply time. Updated both filters to use the canonical naming pattern.

## Review Notes
- The CloudFront + ACM example is a partial snippet (origin and `default_cache_behavior` blocks elided), which the author signals with `# ...distribution config`. This is fine for an illustrative example but readers should know a real `aws_cloudfront_distribution` requires both blocks plus `enabled` to apply.
- The S3 replication example does not show the prerequisites (bucket versioning enabled on both source and destination, IAM role/policy for replication). The author defines `aws_iam_role.replication` by reference only. This is acceptable for a focused multi-region snippet but is a real gotcha at apply time.
- The S3 replication `rule` block omits `filter` / `prefix`. The current AWS provider permits this (defaults to replicating all objects), so this is not an error, but explicitly setting `filter {}` is more idiomatic for V2-style rules.
- The module example accepts the AWS provider as its default (`aws = aws.us_west_2`). Because no aliased provider is required inside the child module, the simple `required_providers` block without `configuration_aliases` is correct.
- The claim that ACM certificates for CloudFront must reside in `us-east-1` is accurate and remains current as of 2026-04-28.
