# Validation Summary: How to Deploy RDS Multi-AZ Instances with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS RDS for PostgreSQL
- AWS provider for Terraform/OpenTofu
- Amazon RDS Multi-AZ DB instances
- Amazon RDS event notifications
- Amazon CloudWatch alarms
- AWS CLI

## Sources Consulted
- HashiCorp AWS provider: `aws_db_instance` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- HashiCorp AWS provider: `aws_db_event_subscription` — https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_event_subscription
- Amazon RDS User Guide: Multi-AZ DB instance deployments — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZSingleStandby.html
- Amazon RDS User Guide: Failing over a Multi-AZ DB instance — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.Failover.html
- Amazon RDS User Guide: Rebooting a DB instance — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_RebootInstance.html
- Amazon RDS User Guide: Working with Amazon RDS event notification — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.html
- Amazon RDS User Guide: Overview of Amazon RDS event notification — https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.overview.html
- AWS CLI Command Reference: `reboot-db-instance` — https://docs.aws.amazon.com/cli/latest/reference/rds/reboot-db-instance.html
- Amazon RDS for PostgreSQL updates — https://docs.aws.amazon.com/AmazonRDS/latest/PostgreSQLReleaseNotes/postgresql-versions.html

## Issues Found

1. **The failover monitoring example was incorrect.** The post used a CloudWatch alarm on `FailedSQLServerAgentJobsCount`, which is a SQL Server-specific metric and not a valid way to detect PostgreSQL Multi-AZ failovers. I replaced it with an `aws_db_event_subscription` example that subscribes to RDS `failover` and related event categories, which is how AWS documents failover notifications for RDS DB instances.

2. **The output labeled a nonexistent standby/reader endpoint.** `aws_db_instance.multi_az.address` is the hostname for the same DB instance endpoint, not a separate standby endpoint. I changed the output from `db_reader_endpoint` to `db_host` and corrected the description accordingly.

3. **The failover verification guidance was incomplete.** The original command only queried `AvailabilityZone`, which can lag after failover and did not surface the standby AZ. I updated the example to query both `AvailabilityZone` and `SecondaryAvailabilityZone`, and added the documented note that AZ reporting can take several minutes to reflect the failover.

4. **The failover timing wording was tightened to match the AWS docs.** I changed the text from "1-2 minutes" to the documented "60-120 seconds" phrasing in the introduction and conclusion.

## Review Notes
- `engine_version = "16.2"` is still a valid Amazon RDS for PostgreSQL version as of April 23, 2026, but it is not the latest available 16.x release. Readers may want to pin a newer supported minor version for production deployments.
- RDS event notifications can take up to five minutes to be delivered, so they are appropriate for operational alerting but not for sub-minute health checks.
- The example uses `password`, which is valid, but the AWS provider documentation notes that this value is stored in state. For production use, managed passwords or write-only password arguments may be preferable.
