# Validation Summary: How to Monitor DMS Replication Tasks

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Database Migration Service
- Amazon CloudWatch metrics, alarms, dashboards, and Logs Insights
- AWS CLI
- AWS CloudFormation
- AWS Lambda
- Amazon SNS
- Amazon EventBridge
- Python and boto3

## Sources Consulted
- AWS DMS monitoring documentation: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Monitoring.html
- AWS DMS logging task settings: https://docs.aws.amazon.com/dms/latest/userguide/CHAP_Tasks.CustomizingTasks.TaskSettings.Logging.html
- AWS DMS DescribeTableStatistics API reference: https://docs.aws.amazon.com/dms/latest/APIReference/API_DescribeTableStatistics.html
- AWS CLI modify-replication-task command reference: https://docs.aws.amazon.com/cli/latest/reference/dms/modify-replication-task.html
- AWS CLI get-metric-statistics command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- AWS CLI put-dashboard command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-dashboard.html
- AWS CloudFormation AWS::CloudWatch::Alarm reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cloudwatch-alarm.html
- boto3 DMS describe_replication_tasks reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dms/client/describe_replication_tasks.html
- boto3 DMS describe_table_statistics reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/dms/client/describe_table_statistics.html

## Issues Found
- The CloudWatch metric example used `date -v-1H`, which is BSD/macOS-specific and fails on GNU/Linux. Changed it to `date -u -d '1 hour ago'`, which works in the Linux shell environment most AWS CLI users run from.
- The full-load metric section listed `FullLoadThroughputRowsSource`, but AWS DMS documents `FullLoadThroughputRowsTarget` as the task metric. Updated the metric name and description.
- The alarm guidance referred to "error metrics" without identifying a documented DMS error metric. Changed this to "task status or log-derived errors."
- The `modify-replication-task` example did not mention that an existing DMS task must be stopped before modification. Added that caveat.
- The table-state descriptions were partly inaccurate. Updated `Table does not exist` to mean DMS cannot find the source table, changed `Table completed` to full-load completion, and added the documented `Table cancelled` state.

## Review Notes
The AWS CLI binary is not installed in this workspace, so CLI option validation was performed against official AWS CLI documentation rather than local `--help` output. The Python snippet parses successfully, and the embedded DMS task-settings and CloudWatch dashboard JSON payloads parse successfully.
