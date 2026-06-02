# Validation Summary: How to Optimize DynamoDB Costs with On-Demand vs Provisioned

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB capacity modes: on-demand and provisioned
- DynamoDB auto scaling with Application Auto Scaling
- Amazon CloudWatch metrics and alarms
- AWS CLI
- Python boto3

## Sources Consulted
- Amazon DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- DynamoDB capacity mode switching considerations: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-switching-capacity-modes.html
- DynamoDB on-demand capacity mode: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/on-demand-capacity-mode.html
- DynamoDB projection expressions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.ProjectionExpressions.html
- DynamoDB read consistency: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- DynamoDB metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- DynamoDB auto scaling: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.html
- AWS CLI update-table reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS CLI Application Auto Scaling register-scalable-target reference: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/register-scalable-target.html
- AWS CLI Application Auto Scaling put-scaling-policy reference: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/put-scaling-policy.html
- AWS CLI CloudWatch put-metric-alarm reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- boto3 CloudWatch get_metric_statistics reference: https://boto3.amazonaws.com/v1/documentation/api/latest/reference/services/cloudwatch/client/get_metric_statistics.html

## Issues Found
- Updated DynamoDB Standard on-demand pricing examples for US East (N. Virginia): write request units are now $0.625 per million and strongly consistent read request units are $0.125 per million, so the monthly write example is $18.75 instead of $37.50.
- Updated the on-demand versus provisioned cost-ratio language from 5-7x / 6.6x to approximately 3x / 3.3x based on current DynamoDB Standard pricing.
- Clarified that the 12 WCU example assumes standard 1 KB writes, matching DynamoDB WCU billing rules.
- Replaced deprecated `datetime.utcnow()` usage in the Python example with `datetime.now(timezone.utc)`.
- Updated the Python analysis output labels from "writes/hour" to "write capacity units/hour" because the CloudWatch metric reports consumed capacity units, not raw write request counts.
- Initialized `prov_write_cost` and `prov_read_cost` to zero so the example does not raise an `UnboundLocalError` if CloudWatch returns no datapoints for writes or reads.
- Updated the Python cost constants to current DynamoDB Standard on-demand request pricing.
- Corrected the capacity-mode switching limit: provisioned to on-demand can be done up to four times in a 24-hour rolling window, while on-demand to provisioned can be done at any time.
- Changed the auto-scaling description from eliminating throttling risk to reducing throttling risk, because DynamoDB auto scaling can still take several minutes to adjust capacity during sustained changes.
- Corrected reserved capacity savings to "up to 54%" for one year and "up to 77%" for three years over regular provisioned hourly rates, not over on-demand pricing.
- Corrected the projection-expression section: projection expressions reduce returned data but do not reduce DynamoDB read capacity consumption, which is based on item size.

## Review Notes
The AWS CLI examples use current command names and option shapes. The post's 4x peak-to-average recommendation is a practical heuristic rather than an AWS-defined threshold.
