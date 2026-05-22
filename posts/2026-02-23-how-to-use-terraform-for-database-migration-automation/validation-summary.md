# Validation Summary: How to Use Terraform for Database Migration Automation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Database Migration Service (AWS DMS)
- Amazon RDS
- Amazon RDS Blue/Green Deployments
- Amazon CloudWatch metrics and dashboards
- Amazon EventBridge / CloudWatch Events
- AWS Lambda
- AWS Systems Manager Automation
- Amazon Route 53

## Sources Consulted
- Terraform AWS provider documentation for `aws_dms_replication_task`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dms_replication_task
- Terraform AWS provider documentation for `aws_db_instance`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform AWS provider documentation for `aws_cloudwatch_event_rule`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- Terraform AWS provider documentation for `aws_cloudwatch_event_target`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_target
- Terraform AWS provider documentation for `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform AWS provider documentation for `aws_ssm_document`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ssm_document
- AWS DMS documentation for table mapping selection rules: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TableMapping.SelectionTransformation.Selections.html
- AWS DMS documentation for task settings: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.html
- AWS DMS monitoring documentation for `CDCLatencyTarget`: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Monitoring.html
- Amazon RDS Blue/Green Deployments documentation: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments.html
- Amazon RDS PostgreSQL blue/green replication methods and major upgrade caveats: https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/blue-green-deployments-replication-type.html
- AWS Systems Manager Automation `aws:executeAwsApi` documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-executeAwsApi.html
- AWS Systems Manager Automation `aws:invokeLambdaFunction` documentation: https://docs.aws.amazon.com/systems-manager/latest/userguide/automation-action-lamb.html
- Boto3/AWS RDS `CreateDBInstanceReadReplica` API reference: https://docs.aws.amazon.com/boto3/latest/reference/services/rds/client/create_db_instance_read_replica.html

## Issues Found
- The DMS replication instance snippet had a comment saying `apply_immediately` enabled CloudWatch logging. `apply_immediately` controls when replication instance changes are applied, while DMS task logging is configured in `replication_task_settings`. Updated the comment.
- The read replica example set `engine_version = var.target_db_version`. RDS read replica creation does not accept an engine version for validating a different target version, and Terraform documentation has historically disallowed `engine_version` with replicas. Removed the invalid attribute.
- The CloudWatch dashboard metric for `CDCLatencyTarget` only included `ReplicationInstanceIdentifier`. AWS DMS publishes the task latency metric with both replication instance and replication task dimensions. Added `ReplicationTaskIdentifier`.
- The EventBridge rule used `is_enabled`, which is deprecated in the Terraform AWS provider. Replaced it with `state = var.migration_active ? "ENABLED" : "DISABLED"`.
- The EventBridge target pointed to a Lambda function without granting EventBridge permission to invoke it. Added an `aws_lambda_permission` resource with `principal = "events.amazonaws.com"` and the rule ARN as `source_arn`.
- The SSM Automation `ChangeResourceRecordSets` step omitted required Route 53 inputs. Added `HostedZoneId` and a `ChangeBatch` that upserts a CNAME to the target RDS address.

## Review Notes
- The snippets are illustrative and still assume surrounding resources and variables exist, including security groups, IAM roles, SNS topics, Lambda deployment packages, hosted zone IDs, and database DNS names.
- `full-load-and-cdc` is a valid AWS DMS migration type, but production use requires source-engine-specific CDC prerequisites such as appropriate logging, permissions, and retention settings.
- RDS Blue/Green Deployments support major and minor upgrades for supported engines, but PostgreSQL major version upgrades have version-specific limitations and may use logical replication depending on the source version.
