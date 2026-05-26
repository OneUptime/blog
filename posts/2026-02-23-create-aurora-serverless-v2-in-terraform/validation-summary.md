# Validation Summary: How to Create Aurora Serverless V2 in Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon Aurora Serverless v2
- Amazon RDS for Aurora PostgreSQL
- Amazon CloudWatch
- AWS IAM
- AWS VPC security groups and DB subnet groups

## Sources Consulted
- AWS Aurora User Guide: Using Aurora serverless - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.html
- AWS Aurora User Guide: How Aurora serverless works - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html
- AWS Aurora User Guide: Requirements and limitations for Aurora serverless - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.requirements.html
- AWS Aurora User Guide: Performance and scaling for Aurora serverless - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.setting-capacity.html
- AWS Aurora User Guide: Scaling to Zero ACUs with automatic pause and resume - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2-auto-pause.html
- AWS Aurora User Guide: Amazon CloudWatch metrics for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- AWS Aurora User Guide: Amazon CloudWatch dimensions for Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/dimensions.html
- Terraform AWS Provider documentation: aws_rds_cluster - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS Provider documentation: aws_rds_cluster_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance

## Issues Found
- The post stated that Aurora Serverless v2 scaling happens in fixed 0.5 ACU increments and takes effect in seconds. AWS documents scaling increments as small as 0.5 ACU, with scale-up timing dependent on the current capacity and the configured capacity range. Updated the wording to avoid overpromising exact scaling timing.
- The post listed 0.5 ACU as the minimum and 128 ACU as the maximum. Current AWS documentation lists Aurora serverless capacity from 0 to 256 ACUs in 0.5 ACU increments, with 0 ACU only available on engine versions that support auto-pause and actual availability dependent on engine and platform version. Updated the capacity range language.
- The mixed-cluster example used serverless reader promotion tiers starting at 1 while describing readers that scale with read traffic and shrink during quiet periods. AWS documents that promotion tiers 0 and 1 scale with the writer, while tiers 2-15 scale independently. Updated the mixed reader promotion tiers to start at 2.
- The staging and development capacity comments implied that 0.5 ACU fully scales down or is always the minimum possible. Updated the comments to distinguish non-paused 0.5 ACU from 0 ACU auto-pause support.
- The provisioned-versus-serverless cost comparison stated definitively that a provisioned db.r6g.xlarge would cost less and give the same performance as sustained 16 ACU usage. Updated this to a conditional cost statement because pricing and performance depend on Region, engine, utilization pattern, instance class, and current AWS pricing.

## Review Notes
The Terraform resource structure is correct for Aurora Serverless v2: `engine_mode = "provisioned"`, `serverlessv2_scaling_configuration` on `aws_rds_cluster`, and `instance_class = "db.serverless"` on serverless cluster instances. The CloudWatch `ServerlessDatabaseCapacity` metric and `DBClusterIdentifier` dimension are documented by AWS. The examples intentionally omit full provider, variable, and VPC definitions, so they should be treated as tutorial snippets rather than a complete standalone Terraform module.
