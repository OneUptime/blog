# Validation Summary: How to Schedule Glue ETL Jobs with Workflows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Glue Workflows
- AWS Glue triggers, jobs, and crawlers
- AWS Glue workflow run properties
- Amazon EventBridge
- Boto3 for Python
- AWS Lambda
- Amazon SNS

## Sources Consulted
- AWS Glue Boto3 `create_workflow` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/glue/client/create_workflow.html
- AWS Glue Boto3 `create_trigger` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/glue/client/create_trigger.html
- AWS Glue Boto3 `get_workflow_run` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/glue/client/get_workflow_run.html
- AWS Glue Boto3 `get_workflow_runs` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/glue/client/get_workflow_runs.html
- AWS Glue workflow run properties documentation: https://docs.aws.amazon.com/glue/latest/dg/workflow-run-properties-code.html
- AWS Glue time-based schedules documentation: https://docs.aws.amazon.com/glue/latest/dg/monitor-data-warehouse-schedule.html
- AWS Glue EventBridge automation documentation: https://docs.aws.amazon.com/glue/latest/dg/automating-awsglue-with-cloudwatch-events.html
- Amazon EventBridge AWS Glue events reference: https://docs.aws.amazon.com/eventbridge/latest/ref/events-ref-glue.html

## Issues Found
- The scheduled trigger comment said the trigger runs daily at 6 AM without stating the time zone. AWS Glue cron schedules use UTC, so the comment now says 6 AM UTC.
- The workflow run property examples used `boto3.client('glue')` without importing `boto3`. Added the missing imports, and made the second snippet self-contained by also importing `sys` and `getResolvedOptions`.
- The failure notification section described a "notification job" but showed Lambda code. Updated the wording to "Lambda function" to match the code.
- The EventBridge section said it reacted to workflow state changes, but the event pattern shown is for `Glue Job State Change` events. Updated the wording to Glue job failures and added the missing `json` import required by `json.dumps`.

## Review Notes
The Boto3 Glue workflow, trigger, run property, workflow run monitoring, retry, and EventBridge job-state examples use current documented APIs. EventBridge Glue service events are delivered on a best-effort basis, so production alerting should account for possible delayed or missing events.
