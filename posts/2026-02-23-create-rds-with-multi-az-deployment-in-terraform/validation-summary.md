# Validation Summary: How to Create RDS with Multi-AZ Deployment in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS provider
- Amazon RDS
- RDS Multi-AZ DB instances
- RDS Multi-AZ DB clusters
- Amazon EventBridge
- Amazon SNS
- AWS CLI
- PostgreSQL
- MySQL

## Sources Consulted
- AWS RDS User Guide: Configuring and managing a Multi-AZ deployment for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html
- AWS RDS User Guide: Multi-AZ DB instance deployments for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- AWS RDS User Guide: Multi-AZ DB cluster deployments for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts.html
- AWS RDS User Guide: Failing over a Multi-AZ DB instance for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- AWS RDS User Guide: Failing over a Multi-AZ DB cluster for Amazon RDS - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts-failover.html
- AWS RDS User Guide: Managing automated backups - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_ManagingAutomatedBackups.html
- AWS RDS User Guide: Overview of Amazon RDS event notification - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.overview.html
- Amazon EventBridge Events Reference: Amazon RDS events - https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-rds.html
- AWS CLI Command Reference: rds reboot-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/reboot-db-instance.html
- AWS CLI Command Reference: rds failover-db-cluster - https://docs.aws.amazon.com/cli/latest/reference/rds/failover-db-cluster.html
- AWS CLI Command Reference: rds describe-events - https://docs.aws.amazon.com/cli/latest/reference/rds/describe-events.html
- Amazon RDS for PostgreSQL Release Notes - https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html
- AWS RDS User Guide: MySQL on Amazon RDS versions - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/MySQL.Concepts.VersionMgmt.html
- Terraform Registry: aws_db_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform Registry: aws_rds_cluster resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster

## Issues Found
- Updated the PostgreSQL example engine version from `16.2` to `16.13`. RDS still documents 16.2 variants, but 16.13 is the current documented PostgreSQL 16 minor version and is a better current example for new deployments.
- Updated the MySQL example engine version from `8.0.35` to `8.0.45`. Current RDS MySQL documentation lists supported 8.0 minor versions from 8.0.37 onward and documents 8.0.45 as available.
- Replaced the claim that the RDS endpoint DNS TTL is 5 seconds with AWS's documented guidance to keep DNS cache TTLs short, including the JVM recommendation of no more than 60 seconds.
- Quoted the EventBridge `detail-type` key in the Terraform `jsonencode` object. Without quotes, the hyphenated key is not valid HCL object key syntax for the intended JSON field.
- Added the `aws rds failover-db-cluster` command and a `describe-events --source-type db-cluster` example for testing failover on Multi-AZ DB clusters. The existing `reboot-db-instance --force-failover` and `describe-events --source-type db-instance` commands apply to Multi-AZ DB instances, not Multi-AZ DB clusters.

## Review Notes
- Terraform was not installed in the workspace, so I could not run `terraform validate`. The HCL snippets were reviewed against Terraform AWS provider documentation and HCL syntax rules.
- The `aws_cloudwatch_event_rule` and `aws_cloudwatch_event_target` resources are still valid Terraform AWS provider resources for EventBridge rules, despite the older CloudWatch Events naming.
- The Multi-AZ DB cluster example uses `aws_rds_cluster` with `db_cluster_instance_class`, which matches the provider model for RDS Multi-AZ DB clusters.
