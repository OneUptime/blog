# Validation Summary: How to Stream CloudWatch Logs to Lambda for Processing

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon CloudWatch Logs subscription filters
- AWS Lambda
- AWS CLI
- AWS CloudFormation
- Python 3.12
- Node.js
- Amazon SNS
- Amazon DynamoDB
- Amazon Data Firehose

## Sources Consulted
- Amazon CloudWatch Logs: Log group-level subscription filters: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/SubscriptionFilters.html
- Amazon CloudWatch Logs: Subscription filter concepts: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/subscription-concepts.html
- Amazon CloudWatch Logs quotas: https://docs.aws.amazon.com/AmazonCloudWatch/latest/logs/cloudwatch_limits_cwl.html
- AWS CLI `logs put-subscription-filter` command reference: https://docs.aws.amazon.com/cli/latest/reference/logs/put-subscription-filter.html
- AWS CloudFormation `AWS::Logs::SubscriptionFilter` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-logs-subscriptionfilter.html
- Boto3 Firehose `put_record_batch` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/firehose/client/put_record_batch.html
- Python 3.12 datetime deprecations: https://docs.python.org/3.12/deprecations/index.html
- AWS Lambda Python runtime documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html

## Issues Found
- CloudWatch Logs can emit `CONTROL_MESSAGE` payloads to check destination reachability. The original Lambda examples assumed every decoded payload contained `logEvents`, which could fail on control messages. Added early returns for `CONTROL_MESSAGE` in the Python and Node.js handlers.
- The Python examples used `datetime.utcfromtimestamp()` and `datetime.utcnow()`, which are deprecated in Python 3.12. Replaced them with timezone-aware `datetime.fromtimestamp(..., tz=timezone.utc)` and `datetime.now(timezone.utc)`.
- The subscription filter limits section gave a specific `10,000 events per second` threshold that was not supported by the current CloudWatch Logs documentation. Replaced it with destination-capacity guidance and a recommendation to monitor `DeliveryThrottling`.
- The CloudFormation section was described as full infrastructure but omitted required Lambda properties and referenced undefined resources/parameters. Updated it to a deployable setup for an existing log group by adding parameters for packaged code and Slack webhook URL, a Lambda execution role, the Lambda `Code` property, and `SourceAccount` on the invoke permission.

## Review Notes
The AWS CLI commands, subscription filter pattern syntax, base64+gzip event format, two-subscription-filter quota, and Firehose 500-record batch limit are consistent with current official documentation. The examples remain simplified and do not include production concerns such as retry handling for failed Firehose records, Slack webhook timeouts, or Lambda concurrency sizing.
