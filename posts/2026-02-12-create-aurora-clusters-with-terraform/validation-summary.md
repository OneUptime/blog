# Validation Summary: How to Create Aurora Clusters with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Aurora
- Amazon RDS
- Aurora PostgreSQL
- Aurora Serverless v2
- Aurora Global Database
- Terraform
- HashiCorp AWS Provider
- AWS KMS
- Amazon CloudWatch Logs and Enhanced Monitoring

## Sources Consulted
- Terraform AWS Provider documentation for `aws_rds_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster
- Terraform AWS Provider documentation for `aws_rds_cluster_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster_instance
- Terraform AWS Provider documentation for `aws_rds_global_cluster`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_global_cluster
- AWS Aurora endpoint documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.Endpoints.html
- AWS Aurora cluster endpoint documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Endpoints.Cluster.html
- AWS Aurora Serverless v2 requirements: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.requirements.html
- AWS Aurora Serverless v2 behavior and capacity ranges: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-serverless-v2.how-it-works.html
- AWS Aurora Global Database documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
- AWS Aurora Global Database region and engine support: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.GlobalDatabase.html
- AWS Aurora storage documentation: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Overview.StorageReliability.html
- AWS announcement for Aurora PostgreSQL 16.2 support: https://aws.amazon.com/about-aws/whats-new/2024/04/amazon-aurora-supports-postgresql-additional-versions/

## Issues Found
- The post described Terraform resources as a fixed writer instance and reader instance. Terraform's `aws_rds_cluster_instance` documentation notes that Aurora does not designate primary and replica instances in the resource configuration; Aurora manages the writer role and failover. Updated the wording, resource names, comments, and tags so the snippet describes cluster instances rather than permanent writer/reader assignments.
- The Serverless v2 cluster example omitted `engine_mode = "provisioned"`. The AWS provider documents `serverlessv2_scaling_configuration` as valid for Serverless v2 under the provisioned engine mode, so the snippet now sets it explicitly.
- The Serverless v2 section said the 0.5 ACU minimum means Aurora can scale almost to zero. AWS documentation distinguishes a 0.5 ACU minimum from true 0 ACU auto-pause support, and Aurora PostgreSQL 16.2 supports the 0.5 ACU minimum. Updated the wording to state that 16.2 scales down to 0.5 ACU, while newer supported versions can use 0 ACU.
- The mixed serverless/provisioned instance example claimed to show mixed capacity but used `db.serverless` for both instances. Updated the second instance to a provisioned class, `db.r6g.large`.
- The Global Database section said the shown Terraform creates a global database spanning two regions, but the snippet only creates the global cluster and primary cluster. Updated the wording to say it starts a global database with a primary cluster and that a secondary cluster in another region is needed to span regions.

## Review Notes
The examples are intentionally partial and still assume supporting variables, provider configuration, private subnets, an application security group, KMS key, and the Enhanced Monitoring IAM role exist. Aurora PostgreSQL engine version availability is region-specific; `16.2` is supported, but teams should check their target region and consider newer minor versions for production deployments.
