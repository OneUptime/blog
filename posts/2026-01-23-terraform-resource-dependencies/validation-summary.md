# Validation Summary: How to Manage Resource Dependencies in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform configuration language
- Terraform CLI
- Terraform dependency graph and `depends_on`
- Terraform modules and data sources
- AWS provider resources for VPC, EC2, Lambda, IAM, CloudWatch Logs, Firehose, Route 53, S3, RDS, and security groups
- Graphviz DOT rendering

## Sources Consulted
- Terraform `depends_on` meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/depends_on
- Terraform resource dependencies tutorial: https://developer.hashicorp.com/terraform/tutorials/configuration-language/dependencies
- Terraform `terraform graph` command reference: https://developer.hashicorp.com/terraform/cli/commands/graph
- Terraform data sources documentation: https://developer.hashicorp.com/terraform/language/data-sources
- Terraform lifecycle meta-argument reference: https://developer.hashicorp.com/terraform/language/meta-arguments/lifecycle
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Terraform AWS provider `aws_lambda_function` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_cloudwatch_log_subscription_filter` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_log_subscription_filter
- Terraform AWS provider `aws_route53_record` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route53_record
- Terraform AWS provider security group rule documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_ingress_rule and https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc_security_group_egress_rule
- Terraform AWS provider `aws_s3_bucket` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket

## Issues Found
- Updated Lambda examples from `nodejs18.x` to `nodejs24.x`. AWS lists `nodejs18.x` as deprecated as of September 1, 2025, while `nodejs24.x` is currently supported, and the latest AWS provider examples use `nodejs24.x`.
- Corrected the CloudWatch Logs subscription example. The original text tied a Firehose subscription filter to an S3 bucket policy dependency, but the subscription filter uses a Firehose destination and an IAM role. The example now models the hidden dependency as an IAM role policy required before CloudWatch Logs can deliver events.
- Replaced `aws_security_group_rule` with `aws_vpc_security_group_egress_rule` and `aws_vpc_security_group_ingress_rule`. The AWS provider documentation describes the newer VPC security group rule resources as the current best practice and advises avoiding `aws_security_group_rule`.
- Corrected the Route 53 "Resource Already Exists" example. `create_before_destroy` is not the right fix for an existing Route 53 record outside Terraform state and can conflict with unique-name constraints. The example now uses `allow_overwrite = true`, which the AWS provider documents for overwriting an existing Route 53 record during creation.

## Review Notes
- Terraform CLI was not installed in the local environment, so CLI command verification was performed against official Terraform CLI documentation rather than local `terraform --help` output.
- The remaining snippets are partial examples and reference resources or data sources defined outside the shown blocks, which is acceptable for a dependency-focused tutorial.
