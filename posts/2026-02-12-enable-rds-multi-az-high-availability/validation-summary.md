# Validation Summary: How to Enable RDS Multi-AZ for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- RDS Multi-AZ DB instance deployments
- RDS Multi-AZ DB clusters
- AWS CLI
- PostgreSQL
- Java DNS caching
- psycopg2
- HikariCP
- Amazon CloudWatch / RDS events

## Sources Consulted
- Amazon RDS User Guide: Multi-AZ DB instance deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- Amazon RDS User Guide: Multi-AZ DB cluster deployments: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts.html
- Amazon RDS User Guide: Failing over a Multi-AZ DB instance: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- Amazon RDS User Guide: Failing over a Multi-AZ DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/multi-az-db-clusters-concepts-failover.html
- Amazon RDS User Guide: Creating a Multi-AZ DB cluster: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/create-multi-az-db-cluster.html
- Amazon RDS User Guide: Amazon RDS storage types: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Amazon RDS User Guide: RDS event categories and messages: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- AWS CLI Command Reference: create-db-instance, modify-db-instance, create-db-cluster, reboot-db-instance, failover-db-cluster, describe-db-instances: https://docs.aws.amazon.com/cli/latest/reference/rds/
- AWS RDS for PostgreSQL pricing: https://aws.amazon.com/rds/postgresql/pricing/
- Psycopg 2.9 documentation: https://www.psycopg.org/docs/module.html
- Oracle Java networking properties: https://docs.oracle.com/en/java/javase/18/docs/api/java.base/java/net/doc-files/net-properties.html
- HikariCP Javadocs: https://javadoc.io/doc/com.zaxxer/HikariCP/latest/com/zaxxer/hikari/HikariConfig.html

## Issues Found
- Corrected the Multi-AZ cluster failover timing from approximately 35 seconds to typically under 35 seconds, matching Amazon RDS documentation.
- Corrected the storage comparison for Multi-AZ DB clusters. The post described cluster storage as "Optimized local SSD"; RDS Multi-AZ DB clusters use supported RDS storage types such as gp3, io1, and io2.
- Added the correct AWS CLI command for manually failing over a Multi-AZ DB cluster: `aws rds failover-db-cluster`. The existing `reboot-db-instance --force-failover` command applies to Multi-AZ DB instance deployments.
- Updated the psycopg2 example to use `dbname` instead of the deprecated `database` alias.
- Replaced stale example RDS pricing numbers with a current-proof description that points readers to the AWS pricing page for exact rates.
- Corrected the listed RDS failover event IDs. The original IDs did not match the official RDS event messages for Multi-AZ failover.

## Review Notes
The AWS CLI commands and flags are valid for current RDS documentation. Some operational values, such as exact engine-version availability by Region, instance-class availability, and pricing, can change over time and should be checked in the target AWS Region before production use.
