# Validation Summary: How to Use Athena with ALB Access Logs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Application Load Balancer
- ALB access logs
- Amazon S3
- Amazon Athena
- AWS CLI
- SQL
- Amazon EventBridge Scheduler
- AWS Lambda
- Amazon SNS

## Sources Consulted
- Elastic Load Balancing User Guide: Access logs for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/load-balancer-access-logs.html
- Elastic Load Balancing User Guide: Enable access logs for your Application Load Balancer: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/enable-access-logging.html
- Amazon Athena User Guide: Create the table for ALB access logs: https://docs.aws.amazon.com/athena/latest/ug/create-alb-access-logs-table.html
- Amazon Athena User Guide: Create the table for ALB access logs in Athena using partition projection: https://docs.aws.amazon.com/athena/latest/ug/create-alb-access-logs-table-partition-projection.html
- Amazon Athena User Guide: Set up partition projection: https://docs.aws.amazon.com/athena/latest/ug/partition-projection-setting-up.html
- AWS CLI Command Reference: elbv2 modify-load-balancer-attributes: https://docs.aws.amazon.com/cli/latest/reference/elbv2/modify-load-balancer-attributes.html
- AWS Lambda Developer Guide: Invoke a Lambda function on a schedule: https://docs.aws.amazon.com/lambda/latest/dg/tutorial-scheduled-events-schedule-expressions.html

## Issues Found
- The post stated that ALB access logs capture every request. AWS documents ALB access logs as best-effort and recommends using them to understand requests rather than as complete accounting, so the wording now reflects that limitation.
- The enablement section showed the AWS CLI command without mentioning that the S3 bucket policy must allow Elastic Load Balancing to write logs. AWS requires that permission, so the setup text now calls it out before the command.
- The ALB log field list and Athena table omitted the current `conn_trace_id` field. The table now includes `conn_trace_id`, and the field list was updated.
- The Athena regex was based on an older ALB access log format and did not include AWS's recommended optional trailing pattern for newer fields. The regex now matches the current AWS Athena example through `conn_trace_id` and tolerates additional trailing fields such as rewrite transform fields.
- The automation section referred to CloudWatch Events for scheduled Lambda execution. AWS now documents EventBridge Scheduler for scheduled Lambda invocation, so the wording now uses Amazon EventBridge Scheduler.

## Review Notes
The partition projection properties, S3 prefix structure, SQL query functions, ALB access log S3 delivery path, and `elbv2 modify-load-balancer-attributes` command syntax are consistent with current AWS documentation. The local environment did not have the `aws` CLI installed, so CLI verification was performed against the current official AWS CLI documentation rather than local `--help` output.
