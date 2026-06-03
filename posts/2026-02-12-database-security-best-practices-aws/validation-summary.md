# Validation Summary: How to Implement Database Security Best Practices on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS RDS for PostgreSQL
- Amazon Aurora database activity streams
- Amazon DynamoDB
- AWS IAM and IAM database authentication
- AWS KMS
- Amazon VPC, private subnets, route tables, and security groups
- Terraform AWS provider
- Python, boto3, and psycopg2

## Sources Consulted
- AWS RDS documentation: Using SSL with a PostgreSQL DB instance - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/PostgreSQL.Concepts.General.SSL.html
- AWS RDS documentation: Database authentication with Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/database-authentication.html
- AWS RDS documentation: Connecting to your DB instance using IAM authentication with PostgreSQL - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.IAMDBAuth.Connecting.AWSCLI.PostgreSQL.html
- AWS Aurora documentation: Monitoring Amazon Aurora with Database Activity Streams - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/DBActivityStreams.html
- boto3 RDS client documentation: start_activity_stream - https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/start_activity_stream.html
- AWS DynamoDB documentation: Using IAM policy conditions for fine-grained access control - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
- Terraform AWS provider documentation: aws_security_group - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider documentation: aws_db_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider documentation: aws_dynamodb_table - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS RDS documentation: Overview of Performance Insights on Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PerfInsights.Overview.html

## Issues Found
- The Terraform security group example used an `egress` block with `cidr_blocks = []` to mean no outbound access. Terraform security group rule blocks require a source or destination such as `cidr_blocks`, `ipv6_cidr_blocks`, `prefix_list_ids`, `security_groups`, or `self`; an empty destination list is not a valid no-egress rule. Changed it to `egress = []`, which is the Terraform-documented way to explicitly remove all managed egress rules.

## Review Notes
- RDS for PostgreSQL 15 supports `rds.force_ssl`, and AWS documents that the default for PostgreSQL 15 and later is already on. Keeping the explicit parameter is still valid because it documents the intended security posture.
- The IAM authentication example is technically correct for PostgreSQL, assuming the database user has been granted the `rds_iam` role and the `sslrootcert` path points to a valid RDS CA bundle.
- AWS has announced Performance Insights end of life for the console experience and flexible retention periods on June 30, 2026. The configuration remains valid as of this review date, but future updates should consider CloudWatch Database Insights Advanced mode.
