# Validation Summary: How to Create Aurora Serverless with Auto-Pause in Terraform

## Status
validated

## Post Type
Tutorial / Infrastructure as Code guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon Aurora Serverless v2
- Amazon RDS / Aurora PostgreSQL
- Amazon Aurora MySQL
- Amazon CloudWatch
- Amazon SNS

## Sources Consulted
- AWS Aurora User Guide: Scaling to Zero ACUs with automatic pause and resume for Aurora Serverless v2 - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html
- AWS Aurora User Guide: How Aurora Serverless v2 works - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html
- AWS RDS API Reference: ServerlessV2ScalingConfiguration - https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_ServerlessV2ScalingConfiguration.html
- AWS Aurora User Guide: Performance and scaling for Aurora Serverless v2 - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html
- AWS Aurora User Guide: Amazon CloudWatch dimensions for Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/dimensions.html
- HashiCorp AWS Provider documentation source: aws_rds_cluster - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_cluster.html.markdown
- HashiCorp AWS Provider documentation source: aws_rds_cluster_instance - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/rds_cluster_instance.html.markdown

## Issues Found
- The post said Aurora Serverless v2 does not support scaling to zero and has a minimum of 0.5 ACU. Updated this to reflect current AWS behavior: supported Aurora Serverless v2 engine versions can set `min_capacity` to `0` and auto-pause.
- The PostgreSQL examples used Aurora PostgreSQL `15.4`, which does not meet the documented auto-pause version requirement. Updated the examples to `15.7`.
- The MySQL example used Aurora MySQL `3.04.0`, which does not meet the documented auto-pause version requirement. Updated it to `3.08.0`.
- The Terraform examples configured `min_capacity = 0.5` and did not include `seconds_until_auto_pause`, so they did not actually create auto-pause behavior. Updated the examples to use `min_capacity = 0.0` and `seconds_until_auto_pause`.
- The main Terraform example set `storage_type = "aurora"`, which is not a valid explicit value for Aurora DB clusters in the AWS provider. Removed it so the default standard Aurora storage is used.
- The development-cost explanation referenced the old always-on `0.5` ACU minimum. Updated it to describe scale-to-zero auto-pause behavior and the fact that compute can stop while idle.
- Added an AWS provider version constraint of `>= 5.81.0` so the Terraform examples use a provider version that supports Serverless v2 scale-to-zero configuration.

## Review Notes
Terraform is not installed in this environment, so I could not run `terraform validate`. The HCL was reviewed manually against the current AWS provider resource documentation. The examples still use static database passwords for brevity; for production, Secrets Manager or managed master user passwords would be preferable.
