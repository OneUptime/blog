# Validation Summary: How to Monitor AWS Batch Jobs with CloudWatch

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Batch
- Amazon CloudWatch Metrics, Alarms, Dashboards, and Logs
- Amazon EventBridge
- CloudWatch Logs Insights
- AWS CLI
- Python
- boto3
- AWS Lambda
- Amazon SNS

## Sources Consulted
- AWS Batch: Use the awslogs log driver: https://docs.aws.amazon.com/batch/latest/userguide/using_awslogs.html
- AWS Batch events: https://docs.aws.amazon.com/batch/latest/userguide/batch_cwe_events.html
- AWS Batch job state change events: https://docs.aws.amazon.com/batch/latest/userguide/batch_job_events.html
- AWS Batch job environment variables: https://docs.aws.amazon.com/batch/latest/userguide/job_env_vars.html
- AWS CLI create-log-group: https://docs.aws.amazon.com/cli/latest/reference/logs/create-log-group.html
- AWS CLI put-retention-policy: https://docs.aws.amazon.com/cli/latest/reference/logs/put-retention-policy.html
- AWS CLI register-job-definition: https://docs.aws.amazon.com/cli/latest/reference/batch/register-job-definition.html
- AWS CLI put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- Amazon CloudWatch dashboard body syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/APIReference/CloudWatch-Dashboard-Body-Structure.html
- Amazon CloudWatch metric concepts and dimensions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html
- Amazon EventBridge resource-based policies for CloudWatch Logs targets: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-use-resource-based.html
- CloudWatch Logs Insights query syntax and functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax.html
- CloudWatch Logs Insights functions: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/CWL_QuerySyntax-operations-functions.html
- boto3 AWS Batch ListJobs paginator: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/batch/paginator/ListJobs.html

## Issues Found
- The `aws logs create-log-group` command incorrectly used `--retention-in-days`, which belongs to `put-retention-policy`. Changed the example to create the log group first and then set retention with `aws logs put-retention-policy`.
- The AWS Batch awslogs stream name was shown as `my-app/<container-name>/<ecs-task-id>`. AWS Batch uses `prefix/default/ecs-task-id` for this job definition pattern, so the example now says `my-app/default/<ecs-task-id>`.
- The EventBridge rule sent events to CloudWatch Logs without the resource policy required when configuring this target by CLI. Added the `aws logs put-resource-policy` command for EventBridge delivery to `/aws/events/*`.
- The custom metrics were emitted with both `JobQueue` and `JobDefinition` dimensions, but the alarm and dashboard examples selected only the metric name or only one dimension. Added both dimensions to the alarms and dashboard metric widgets so they match the emitted custom metrics.
- The first dashboard widget was titled "Job Completion Rate" while it displayed `TotalRecordsProcessed`. Renamed it to "Records Processed" to match the metric.
- The Logs Insights success-rate query used SQL-style `case when ... then ... else ... end`, which is not CloudWatch Logs Insights syntax. Replaced it with `case(condition, value, default)`.
- The slowest-jobs Logs Insights query parsed the example completion log too loosely and sorted the duration as the parsed value. Updated the parse pattern to match the emitted log line and convert duration to a numeric field before sorting.
- The structured logging Python example used `os.environ` without importing `os`. Added the missing import.
- The structured logging Python example referenced `AWS_BATCH_JOB_NAME`, which is not one of the documented AWS Batch-provided environment variables. Replaced it with `AWS_BATCH_JQ_NAME` as `job_queue`.
- Corrected the product name from "CloudWatch Log Insights" to "CloudWatch Logs Insights".

## Review Notes
- The local AWS CLI was not installed in the review environment, so CLI command validation was performed against official AWS CLI and service documentation rather than local `aws --help` output.
- Python snippets were syntax-checked after edits. The sample processing functions in the custom metrics example, such as `get_data_batches()` and `process_batch()`, remain placeholders as intended by the surrounding text.
