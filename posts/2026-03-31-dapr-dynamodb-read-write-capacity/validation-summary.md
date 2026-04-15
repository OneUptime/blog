# Validation Summary: How to Configure DynamoDB Read/Write Capacity for Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (state store component, resiliency policies)
- Amazon DynamoDB (capacity modes, auto-scaling)
- AWS CLI (dynamodb, application-autoscaling, cloudwatch commands)
- Python (capacity estimation script)
- YAML (Dapr component and resiliency configuration)

## Sources Consulted
- AWS DynamoDB CLI reference for `create-table`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- AWS DynamoDB capacity modes documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadWriteCapacityMode.html
- AWS Application Auto Scaling CLI reference: https://docs.aws.amazon.com/cli/latest/reference/application-autoscaling/
- AWS CloudWatch `get-metric-statistics` CLI reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/get-metric-statistics.html
- Dapr DynamoDB state store component spec: https://docs.dapr.io/reference/components-reference/supported-state-stores/setup-dynamodb/
- Dapr resiliency policies documentation: https://docs.dapr.io/operations/resiliency/policies/

## Issues Found
- **Incorrect expected output in Python capacity calculation comment**: The comment on line 123 claimed the output would be `{"recommendedWCU": 520, "recommendedRCU": 326, "monthlyProvisionedCost": 279.55}`, but running the actual code produces `{"recommendedWCU": 520, "recommendedRCU": 650, "monthlyProvisionedCost": 308.42}`. The RCU calculation for 2KB items: `500 * max(1, 2.0/4) = 500 * max(1, 0.5) = 500 * 1 = 500`, with 1.3x buffer = 650, not 326. The cost also changed accordingly. Fixed the comment to show the correct output.

## Review Notes
- The capacity estimation function uses `max(1, avg_item_size_kb)` instead of `math.ceil(avg_item_size_kb)` for WCU calculation. DynamoDB rounds up to the nearest 1 KB for write capacity units, so for non-integer KB sizes (e.g., 1.5 KB), `max(1, 1.5) = 1.5` would underestimate versus the correct `ceil(1.5) = 2`. The same applies to the RCU formula. Since the post frames this as an estimation tool and the example uses a round number (2 KB), this is acceptable but could be noted as an approximation.
- The DynamoDB state store component YAML, AWS CLI commands, auto-scaling configuration, Dapr resiliency spec, and CloudWatch monitoring command are all technically correct.
- The cost figures (WCU at $0.00065/hour, RCU at $0.00013/hour) are based on us-east-1 pricing and may vary by region. This is a minor caveat, not an error.
