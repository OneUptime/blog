# Validation Summary: How to Build a Serverless Cron Job with EventBridge and Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon EventBridge scheduled rules
- Amazon EventBridge Scheduler
- AWS Lambda
- Amazon DynamoDB
- Amazon SES
- Amazon SNS
- Amazon CloudWatch alarms
- AWS CLI
- Python

## Sources Consulted
- Amazon EventBridge scheduled rules documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-create-rule-schedule.html
- Amazon EventBridge scheduled rule cron and rate expression documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-scheduled-rule-pattern.html
- AWS CLI `events put-rule` command reference: https://docs.aws.amazon.com/cli/latest/reference/events/put-rule.html
- AWS CLI `events put-targets` command reference: https://docs.aws.amazon.com/cli/latest/reference/events/put-targets.html
- AWS CLI `scheduler create-schedule` command reference: https://docs.aws.amazon.com/cli/latest/reference/scheduler/create-schedule.html
- EventBridge Scheduler schedule management documentation: https://docs.aws.amazon.com/scheduler/latest/UserGuide/managing-schedule.html
- Amazon CloudWatch missing alarm data documentation: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/alarms-and-missing-data.html
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- AWS Lambda Python deployment package documentation: https://docs.aws.amazon.com/lambda/latest/dg/python-package.html
- Amazon DynamoDB Scan documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Scan.html
- Python `datetime` documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The DynamoDB cleanup example used a single `scan` call, which only processes up to one page of results. Updated it to continue scanning while `LastEvaluatedKey` is present.
- The daily report example also used a single DynamoDB `scan` call. Updated it to paginate and aggregate all matching orders.
- The Python examples used `datetime.utcnow()`, which is deprecated in Python 3.12 and later. Replaced it with `datetime.now(timezone.utc)`.
- The health-check example imported `requests`, which is not included by default in modern AWS Lambda Python runtimes unless packaged with the function. Replaced it with standard-library `urllib` code.
- The CloudWatch missing-execution explanation said CloudWatch treats missing data as "not breaching" by default. Updated it to state the actual default `missing` behavior, where an alarm with no recent data can move to `INSUFFICIENT_DATA`.

## Review Notes
- The EventBridge rule commands and cron/rate expressions are technically valid, but AWS documentation now labels scheduled rules as a legacy feature and recommends EventBridge Scheduler for scheduled tasks. The post already includes EventBridge Scheduler as the more advanced option.
- AWS CLI was not installed in the local environment, so CLI verification was performed against official AWS CLI documentation instead of local `aws --help` output.
