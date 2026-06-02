# Validation Summary: How to Use Terraform AWS Provider Aliases for Multi-Region

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS provider aliases and module provider passing
- Amazon S3 Cross-Region Replication
- AWS Certificate Manager (ACM)
- Amazon CloudFront
- Amazon Route 53
- Amazon DynamoDB Global Tables
- Amazon EC2 AMI data sources

## Sources Consulted
- Terraform provider meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/provider
- Terraform providers meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/providers
- Terraform providers within modules documentation: https://developer.hashicorp.com/terraform/language/modules/develop/providers
- Terraform provider configuration documentation: https://developer.hashicorp.com/terraform/language/providers/configuration
- HashiCorp AWS Provider `aws_s3_bucket_replication_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_replication_configuration
- HashiCorp AWS Provider `aws_acm_certificate_validation` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/acm_certificate_validation
- HashiCorp AWS Provider `aws_dynamodb_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- HashiCorp AWS Provider `aws_ami` data source documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Amazon CloudFront certificate requirements: https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/cnames-and-https-requirements.html
- Amazon S3 replication requirements: https://docs.aws.amazon.com/AmazonS3/latest/userguide/replication-requirements.html
- Amazon DynamoDB global tables documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Streams.CrossRegionRepl.html
- Referenced OneUptime ACM article: https://oneuptime.com/blog/post/2026-02-12-create-acm-certificates-terraform/view

## Issues Found
- The ACM/CloudFront example referenced `data.aws_route53_zone.main.zone_id` without declaring the data source. Added a `data "aws_route53_zone" "main"` block so the snippet has the referenced zone lookup.
- The S3 replication example used a replication rule without `filter {}`. Updated it to include an empty `filter {}` block for the current S3 replication V2 pattern when the rule applies to all objects.
- The module section said providers need to be explicitly passed through whenever modules are used. Terraform child modules automatically inherit default provider configurations, while aliased provider configurations must be passed explicitly when needed. Updated the wording to match Terraform's documented behavior.
- The multi-region `for_each` section implied provider maps can be used dynamically with `for_each`. Terraform requires provider references to be static and does not allow arbitrary expressions for provider selection. Updated the wording to clarify that each aliased provider reference must remain static.
- The provider state gotcha said changing a resource provider is treated as destroy-and-recreate. Terraform records provider configurations in state, and changing/removing provider aliases can cause planning failures or region lookups rather than a simple guaranteed recreate. Updated the wording to describe the actual state behavior more accurately.

## Review Notes
- The post is technically relevant and the corrected examples use current Terraform and AWS provider patterns.
- Terraform was not installed in the local environment, so validation was performed against official Terraform, HashiCorp AWS Provider, and AWS service documentation rather than by running `terraform validate`.
