# Validation Summary: How to Enable RDS Storage Auto Scaling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon RDS
- RDS Storage Auto Scaling
- Amazon Aurora storage scaling
- AWS CLI
- Amazon CloudWatch metrics and alarms
- Boto3 for Python
- Terraform AWS Provider

## Sources Consulted
- Amazon RDS User Guide: Managing capacity automatically with Amazon RDS storage autoscaling - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/USER_PIOPS.Autoscaling.html
- Amazon RDS User Guide: Amazon RDS DB instance storage - https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/CHAP_Storage.html
- Amazon Aurora User Guide: Managing performance and scaling for Aurora DB clusters - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/Aurora.Managing.Performance.html
- Amazon Aurora User Guide: Quotas and constraints for Amazon Aurora - https://docs.aws.amazon.com/AmazonRDS/latest/AuroraUserGuide/CHAP_Limits.html
- AWS CLI Command Reference: rds create-db-instance - https://docs.aws.amazon.com/cli/latest/reference/rds/create-db-instance.html
- AWS CLI Command Reference: cloudwatch get-metric-statistics - https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- Boto3 RDS Client: describe_db_instances - https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/describe_db_instances.html
- Boto3 RDS Client: describe_valid_db_instance_modifications - https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/describe_valid_db_instance_modifications.html
- Terraform AWS Provider: aws_db_instance - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance

## Issues Found
- The post said RDS increases storage by at least 5 GB. AWS currently documents the minimum autoscaling increment as 10 GiB, so this was corrected.
- The predicted storage increase was described only as based on the past hour of consumption. AWS documents that RDS predicts growth over the next 7 hours based on the past hour of FreeStorageSpace metrics, so the explanation was updated.
- The post did not mention the maximum storage threshold constraints. AWS requires the threshold to be at least 10% above allocated storage and recommends at least 26% above allocated storage to avoid warning events, so that detail was added.
- The CloudWatch metric example used BSD/macOS `date -v-30d`, which fails on common Linux shells. The example was changed to GNU `date -d '30 days ago'` and emits ISO 8601 UTC timestamps with `Z`.
- The cooldown description said RDS waits at least 6 hours after an autoscaling event. AWS documents the lockout as 6 hours or until storage optimization completes, whichever is longer, so the wording was corrected.
- The maximum size limitations listed magnetic storage as if it supported storage autoscaling. AWS documents that magnetic storage does not support storage autoscaling and is being deprecated, so the limitation was corrected.
- The Aurora section stated a fixed 128 TB maximum. AWS now documents Aurora cluster volume maximums as version-dependent, with many versions at 128 TiB and newer Aurora MySQL and Aurora PostgreSQL versions up to 256 TiB, so that was updated.
- The Boto3 script used a single `describe_db_instances` call, so it could miss instances after the first page. It now uses the official paginator.
- The Boto3 script assumed a 64 TiB cap and did not verify whether each instance supports storage autoscaling. It now checks `describe_valid_db_instance_modifications`, skips unsupported instances, and caps the target at the maximum valid storage size for the instance.

## Review Notes
The AWS CLI and Terraform examples use current parameter names. The sample `create-db-instance` command is still intentionally minimal; real deployments often need subnet groups, security groups, backup settings, and deletion protection.
