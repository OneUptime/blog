# Validation Summary: How to Create Aurora Global Database with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- Amazon Aurora PostgreSQL
- Amazon Aurora Global Database
- Amazon RDS
- Amazon CloudWatch metrics and alarms
- AWS multi-Region disaster recovery

## Sources Consulted
- AWS Aurora User Guide: Using Amazon Aurora Global Database: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.html
- AWS Aurora User Guide: Configuration requirements of an Amazon Aurora global database: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database.configuration.requirements.html
- AWS Aurora User Guide: Supported Regions and DB engines for Aurora global databases: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Concepts.Aurora_Fea_Regions_DB-eng.Feature.GlobalDatabase.html
- AWS Aurora User Guide: Using switchover or failover in Amazon Aurora Global Database: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/aurora-global-database-disaster-recovery.html
- AWS Aurora User Guide: Amazon CloudWatch metrics for Amazon Aurora: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.AuroraMonitoring.Metrics.html
- AWS Aurora PostgreSQL Release Notes: Release calendars for Aurora PostgreSQL: https://docs.aws.amazon.com/AmazonRDS/latest/AuroraPostgreSQLReleaseNotes/aurorapostgresql-release-calendar.html
- Terraform Registry: aws_rds_global_cluster resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_global_cluster
- Terraform Registry: aws_rds_cluster resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/rds_cluster

## Issues Found
- The post said Aurora Global Database supports up to five secondary clusters. AWS documentation now states up to 10 read-only secondary AWS Regions. Updated the explanation to say up to 10 secondary clusters.
- The Terraform example pinned Aurora PostgreSQL `15.4`, which is no longer listed in the current Aurora PostgreSQL minor version support calendar. Updated the example to `15.17`, a currently supported Aurora PostgreSQL 15 minor version.
- The CloudWatch alarm labeled `AuroraGlobalDBReplicatedWriteIO` as data transfer volume. AWS documents this metric as replicated write I/O count, while data transfer bytes use `AuroraGlobalDBDataTransferBytes`. Updated the comment, alarm name, threshold comment, and description to describe replicated write I/O accurately.
- The failover section described planned failover as detaching and promoting a secondary cluster. AWS now documents planned role changes as Aurora Global Database switchovers. Updated the text to use switchover terminology and note that it is done through the console, CLI, or API.
- The failover section said unplanned failover automatically promotes the secondary cluster. AWS documentation describes managed or manual failover as an operator-initiated procedure. Updated the text to say that you initiate managed failover, or use manual detach-and-promote when managed failover is not available.

## Review Notes
The Terraform resource shapes and provider aliases are consistent with the AWS provider documentation. The snippets are illustrative and omit production concerns such as KMS key selection, private routing, final snapshots, and state protection for sensitive database credentials.
