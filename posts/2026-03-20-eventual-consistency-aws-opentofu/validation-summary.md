# Validation Summary: How to Handle Eventual Consistency with AWS Resources in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS IAM
- Amazon EC2
- Amazon S3
- Amazon CloudFront
- Amazon Route 53
- AWS CLI
- HashiCorp time provider

## Sources Consulted
- AWS IAM User Guide, Troubleshoot IAM: https://docs.aws.amazon.com/IAM/latest/UserGuide/troubleshoot.html
- Amazon EC2 Developer Guide, Eventual consistency in the Amazon EC2 API: https://docs.aws.amazon.com/ec2/latest/devguide/eventual-consistency.html
- Amazon S3 User Guide, What is Amazon S3? / Amazon S3 data consistency model: https://docs.aws.amazon.com/AmazonS3/latest/userguide/Welcome.html
- OpenTofu docs, The `terraform_data` Managed Resource Type: https://opentofu.org/docs/language/resources/tf-data/
- AWS CLI Command Reference, `iam wait role-exists`: https://docs.aws.amazon.com/cli/latest/reference/iam/wait/role-exists.html
- Amazon CloudFront API Reference, `Distribution`: https://docs.aws.amazon.com/cloudfront/latest/APIReference/API_Distribution.html
- Terraform AWS provider docs source, `aws_cloudfront_distribution`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/cloudfront_distribution.html.markdown
- Amazon Route 53 Developer Guide, Editing records: https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/resource-record-sets-editing.html
- HashiCorp time provider registry page: https://registry.terraform.io/providers/hashicorp/time/latest
- HashiCorp time provider repository README: https://github.com/hashicorp/terraform-provider-time

## Issues Found
- The introduction overstated the point by saying AWS as a whole is eventually consistent. I narrowed that claim to AWS control plane APIs and kept the examples tied to IAM and EC2, which is what the official docs support.
- The IAM section claimed a specific 5-10 second propagation delay. AWS IAM documentation does not guarantee that window, so I replaced it with the documented statement that IAM changes are not always immediately visible.
- The S3 section treated bucket-policy-related behavior as an S3 eventual-consistency example and recommended a fixed sleep. I replaced that with the current S3 strong-consistency guidance for normal object PUT, GET, and LIST workflows.
- The post used `null_resource` for a provisioner-only verification step. I changed that example to `terraform_data`, which OpenTofu documents as the replacement pattern for this use case, and I switched the custom shell loop to the official `aws iam wait role-exists` waiter.
- The CloudFront section recommended an extra `time_sleep` after the distribution resource and implied that `Deployed` might still be too early. I corrected that to use `wait_for_deployment = true` and clarified that Route 53 propagation is a separate concern.
- The time provider example pinned `hashicorp/time` to `~> 0.9`, which is behind the current release line. I updated it to `~> 0.13`.
- The Lambda snippets were missing required arguments needed to create a function. I added `filename`, `handler`, and `runtime` so the examples are technically viable instead of pseudocode.

## Review Notes
Fixed sleeps can still be a practical workaround when a provider does not model a propagation dependency, but the AWS and OpenTofu documentation both point toward explicit verification and provider-native wait behavior where available. The CloudFront example remains intentionally partial and focuses only on deployment waiting, not a complete distribution definition.
