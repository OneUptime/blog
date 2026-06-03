# Validation Summary: How to Use DynamoDB On-Demand vs Provisioned Capacity

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB on-demand and provisioned capacity modes
- DynamoDB auto scaling with Application Auto Scaling
- AWS CLI
- AWS SDK for JavaScript v3
- Amazon CloudWatch metrics
- Python boto3

## Sources Consulted
- Amazon DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- DynamoDB on-demand capacity mode: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html
- DynamoDB read/write capacity mode switching: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/switching.capacitymode.html
- DynamoDB provisioned capacity and auto scaling: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html
- DynamoDB metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- AWS CLI update-table command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS CLI describe-table command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-table.html
- Application Auto Scaling scalable targets: https://docs.aws.amazon.com/autoscaling/application/userguide/services-that-can-integrate-dynamodb.html
- AWS SDK for JavaScript v2 end-of-support announcement: https://aws.amazon.com/blogs/developer/announcing-end-of-support-for-aws-sdk-for-javascript-v2/
- AWS SDK for JavaScript v3 Application Auto Scaling client: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/application-auto-scaling/
- Boto3 CloudWatch get_metric_statistics reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch/client/get_metric_statistics.html
- Python datetime documentation: https://docs.python.org/3/library/datetime.html

## Issues Found
- The on-demand pricing values were outdated. Updated us-east-1 standard table on-demand pricing from $1.25/$0.25 per million write/read request units to $0.625/$0.125, and recalculated the example monthly cost and provisioned-vs-on-demand multiplier.
- The post implied on-demand mode serves unlimited traffic without throttling risk. Updated the explanation to match DynamoDB's documented on-demand scaling behavior, including the ability to instantly handle up to double the previous peak and the possibility of throttling for larger sudden spikes.
- The reserved capacity savings were understated and outdated. Updated the 1-year and 3-year savings figures to the current published "up to" values.
- The JavaScript auto scaling example used AWS SDK for JavaScript v2, which reached end of support on September 8, 2025. Replaced it with the AWS SDK for JavaScript v3 Application Auto Scaling client and command pattern.
- The capacity mode switching limit was inaccurate. Replaced "once every 24 hours" with DynamoDB's documented rule: up to four provisioned-to-on-demand switches in a rolling 24-hour period, with one switch back to provisioned in that same window.
- The `describe-table` query could return null for provisioned tables without a `BillingModeSummary`. Updated the query to default to `PROVISIONED`.
- The CloudWatch capacity planning snippet used `Average` and `Maximum` for `ConsumedWriteCapacityUnits`, which does not directly produce consumed capacity units per second for sizing. Updated it to use `Sum` over the period and divide by the period length.
- The Python snippet used `datetime.utcnow()`, which is deprecated in modern Python. Updated it to use timezone-aware UTC datetimes.

## Review Notes
The remaining AWS CLI examples use current command names and option shapes. The post's pricing examples are region-specific and should be rechecked if republished for another AWS Region or after future DynamoDB pricing changes.
