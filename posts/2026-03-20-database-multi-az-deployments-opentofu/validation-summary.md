# Validation Summary: How to Deploy Multi-AZ RDS Databases with OpenTofu

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS RDS (PostgreSQL)
- AWS Multi-AZ deployments
- AWS db_subnet_group
- AWS RDS event subscriptions / SNS
- AWS CLI (`aws rds`)

## Sources Consulted
- AWS RDS CloudWatch metrics reference: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/rds-metrics.html
- AWS RDS event categories and messages: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_Events.Messages.html
- Terraform AWS provider — `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider — `aws_db_subnet_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_subnet_group
- Terraform AWS provider — `aws_db_event_subscription`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_event_subscription
- AWS CLI reference for `aws rds reboot-db-instance` and `aws rds describe-events`
- AWS RDS Multi-AZ documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/Concepts.MultiAZ.html

## Issues Found
- **Fabricated CloudWatch metric.** The "Monitoring Failover Events" section originally defined an `aws_cloudwatch_metric_alarm` against the metric `RDSFailoverCount` in the `AWS/RDS` namespace. No such metric exists — the official AWS/RDS namespace contains no failover counter (failovers are surfaced via RDS events, not CloudWatch metrics). I replaced the section with an `aws_db_event_subscription` that subscribes to the `failover`, `failure`, and `availability` event categories and publishes to SNS, which is the documented AWS-supported mechanism for failover alerting.
- **Summary updated for consistency.** The Summary previously said "Monitor failovers with CloudWatch Events"; I updated it to refer to an RDS event subscription on the `failover` category to match the corrected section.

## Review Notes
- The `aws_db_instance` block is correct: `multi_az`, `db_subnet_group_name`, `vpc_security_group_ids`, backup/maintenance windows, `deletion_protection`, `skip_final_snapshot`, and `final_snapshot_identifier` are all valid arguments on the current Terraform AWS provider.
- The Multi-AZ vs. Read Replica comparison is accurate for the standard Multi-AZ DB instance deployment. Note that AWS also offers a separate "Multi-AZ DB cluster" deployment that exposes two readable standbys; the post covers the more common single-standby Multi-AZ instance, which is the right scope.
- PostgreSQL `engine_version = "15.4"` is valid but is no longer the latest minor of the 15 line; readers running this in 2026 may want to pin a more current 15.x or 16.x release. Not a correctness issue.
- The `aws rds reboot-db-instance --force-failover` and `aws rds describe-events` commands are correct. The triple-spaces between flags in the bash block are unusual but legal shell tokenization (whitespace runs collapse), so the commands execute correctly as written.
- The claim that the endpoint address stays the same during failover (DNS-redirected to the new primary) is correct.
- The "1-2 minutes" failover figure aligns with AWS guidance that typical Multi-AZ failover completes within ~60-120 seconds.
