# Validation Summary: How to Monitor Kinesis Data Streams with CloudWatch

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon Kinesis Data Streams
- Amazon CloudWatch metrics, alarms, and dashboards
- AWS CLI
- AWS Lambda
- Python and boto3

## Sources Consulted
- AWS Kinesis Data Streams Developer Guide: Monitor the Amazon Kinesis Data Streams service with Amazon CloudWatch: https://docs.aws.amazon.com/streams/latest/dev/monitoring-with-cloudwatch.html
- AWS CLI Command Reference: kinesis enable-enhanced-monitoring: https://docs.aws.amazon.com/cli/latest/reference/kinesis/enable-enhanced-monitoring.html
- AWS CLI Command Reference: cloudwatch put-metric-alarm: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS CLI Command Reference: cloudwatch get-metric-data: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-data.html
- Amazon CloudWatch User Guide: Dashboard body structure and syntax: https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/CloudWatch-Dashboard-Body-Structure.html
- Botocore Kinesis client reference: update_shard_count: https://docs.aws.amazon.com/botocore/latest/reference/services/kinesis/client/update_shard_count.html
- AWS Kinesis Data Streams Developer Guide: Change the data retention period: https://docs.aws.amazon.com/streams/latest/dev/kinesis-extended-retention.html
- AWS Kinesis Data Streams Developer Guide: Develop enhanced fan-out consumers with dedicated throughput: https://docs.aws.amazon.com/streams/latest/dev/enhanced-consumers.html

## Issues Found
- The post described basic stream-level Kinesis metrics as having 5-minute granularity. AWS documentation states stream-level metrics are sent to CloudWatch every minute, so this was corrected to 1-minute granularity.
- The critical lag alarm comment said that at 1 hour of lag "you might hit the retention limit." Kinesis streams retain records for 24 hours by default and can retain up to 365 days, so the comment was changed to say continued growth can eventually hit the retention limit.
- The automated remediation section used `update_shard_count` without noting its scope. AWS documents this API as supported only for provisioned capacity mode, so the text now specifies provisioned streams.

## Review Notes
The local environment did not have the AWS CLI installed, so command syntax was verified against the official AWS CLI documentation instead of local `--help` output. The embedded Python Lambda snippet was syntax-checked locally.
