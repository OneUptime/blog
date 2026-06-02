# Validation Summary: How to Optimize DynamoDB Costs with Reserved Capacity

## Status
validated

## Post Type
Tutorial / cost optimization guide

## Technologies Covered
- Amazon DynamoDB
- DynamoDB reserved provisioned capacity
- Amazon CloudWatch metrics
- AWS CLI
- Application Auto Scaling
- AWS Cost Explorer API
- Python / boto3

## Sources Consulted
- AWS DynamoDB Developer Guide: Reserved capacity: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/reserved-capacity.html
- AWS DynamoDB pricing: https://aws.amazon.com/dynamodb/pricing/
- AWS DynamoDB reserved capacity pricing and purchase details: https://aws.amazon.com/dynamodb/reserved-capacity/
- AWS DynamoDB Developer Guide: Throughput capacity modes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/capacity-mode.html
- AWS DynamoDB Developer Guide: Provisioned capacity mode: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/provisioned-capacity-mode.html
- AWS DynamoDB Developer Guide: Metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- AWS DynamoDB Developer Guide: Using the AWS CLI to manage DynamoDB auto scaling: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.CLI.html
- AWS Billing and Cost Management API Reference: GetCostAndUsage: https://docs.aws.amazon.com/aws-cost-management/latest/APIReference/API_GetCostAndUsage.html
- Boto3 CloudWatch client reference: get_metric_statistics: https://docs.aws.amazon.com/boto3/latest/reference/services/cloudwatch/client/get_metric_statistics.html
- Boto3 Cost Explorer client reference: get_cost_and_usage: https://docs.aws.amazon.com/boto3/latest/reference/services/ce/client/get_cost_and_usage.html

## Issues Found
- The post described reserved capacity as saving up to 77% off on-demand pricing. AWS documents the discount as up to 77% off standard provisioned capacity pricing, so the description and introduction were corrected.
- The post described DynamoDB as having three pricing models. DynamoDB has two throughput pricing modes, on-demand and provisioned, while reserved capacity is a savings option for provisioned capacity. The wording was corrected.
- The eligibility explanation omitted important reserved capacity restrictions. The post now states that reserved capacity applies to single-Region provisioned RCUs/WCUs for DynamoDB Standard tables, including secondary indexes, and excludes on-demand mode, Standard-IA tables, and replicated WCUs.
- The on-demand write request price was outdated. AWS currently lists DynamoDB Standard on-demand writes in US East (N. Virginia) at about $0.625 per million write request units, so the pricing example was updated from $1.25.
- The example monthly cost for 1,000 WCUs with a 1-year reservation was too low. Using the post's stated hourly and upfront assumptions, the amortized cost is about $218/month, not $150/month.
- The CloudWatch sizing script used consumed capacity metrics as the reservation baseline. Reserved capacity discounts apply to provisioned RCUs/WCUs, so the script and surrounding text were updated to use `ProvisionedReadCapacityUnits` and `ProvisionedWriteCapacityUnits`. The datetime call was also updated from deprecated `datetime.utcnow()` to timezone-aware UTC.
- The purchasing section implied reserved capacity could be purchased through the CLI. AWS documentation describes purchasing through the AWS Management Console; the CLI example was kept only for viewing available offerings.
- The Cost Explorer script did not handle paginated responses and could omit some usage-type groups. It now loops over `NextPageToken`.

## Review Notes
The AWS CLI commands for DynamoDB auto scaling match the official DynamoDB auto scaling documentation. The AWS CLI was not installed in the local environment, so command verification was performed against official AWS documentation rather than local `--help` output.
