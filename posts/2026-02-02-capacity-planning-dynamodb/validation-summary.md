# Validation Summary: How to Handle Capacity Planning in DynamoDB

## Status
validated

## Post Type
Tutorial / Guide — covers DynamoDB capacity planning with executable JavaScript code examples, configuration patterns, and architecture diagrams.

## Technologies Covered
- Amazon DynamoDB (RCUs/WCUs, provisioned mode, on-demand mode, reserved capacity, global tables)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- AWS Application Auto Scaling (`@aws-sdk/client-application-auto-scaling`)
- Amazon CloudWatch (`@aws-sdk/client-cloudwatch`)
- DynamoDB scheduled scaling (cron expressions)
- Mermaid diagrams

## Sources Consulted
- DynamoDB CreateTable API reference — https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_CreateTable.html
- PointInTimeRecoverySpecification — https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_PointInTimeRecoverySpecification.html
- DynamoDB CloudWatch metrics and dimensions — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- Troubleshooting throttling with CloudWatch — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TroubleshootingThrottling-cloudwatch.html
- DynamoDB Reserved Capacity pricing — https://aws.amazon.com/dynamodb/pricing/reserved-capacity/
- Application Auto Scaling PutScheduledAction — https://docs.aws.amazon.com/autoscaling/application/APIReference/API_PutScheduledAction.html
- DynamoDB Auto Scaling CLI reference — https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/AutoScaling.CLI.html
- AWS SDK for JavaScript v3 — https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/dynamodb/

## Issues Found

1. **Incorrect CloudWatch throttling metric names.** The `analyzeCapacity` example used `ReadThrottledRequests` and `WriteThrottledRequests`, neither of which is an official DynamoDB CloudWatch metric. The canonical names are `ReadThrottleEvents` and `WriteThrottleEvents` (per the AWS DynamoDB CloudWatch metrics docs). Calls using the original names would silently return empty datapoint sets. Updated both arguments in the `Promise.all` to use the correct metric names.

2. **Reserved Capacity discount values in code did not match the prose table or AWS reality.** The `ReservedCapacityAnalyzer` pricing constants implied ~23% (1-year) and ~60% (3-year) discounts, but the prose table immediately above the snippet states ~50% and ~75%, and AWS advertises up to ~54% and ~77% respectively. Updated `reserved1Year.rcu` from `0.0001` to `0.00006`, `reserved1Year.wcu` from `0.0005` to `0.0003`, `reserved3Year.rcu` from `0.000052` to `0.00003`, and `reserved3Year.wcu` from `0.00026` to `0.00015`. Comment annotations updated from "~23% discount" / "~60% discount" to "~54% discount" / "~77% discount" so the code is now consistent with the table and reflects real AWS reserved capacity pricing.

## Review Notes

- The RCU/WCU consumption table (strongly consistent = 1 RCU/4KB, eventually consistent = 0.5 RCU/4KB, transactional = 2 RCUs/4KB; standard write = 1 WCU/1KB, transactional write = 2 WCUs/1KB) matches the AWS DynamoDB documentation.
- `PointInTimeRecoverySpecification` is correctly accepted by `CreateTableCommand` — AWS added it to `CreateTable` so PITR can be enabled at table creation without a follow-up `UpdateContinuousBackups` call. No fix needed.
- `PutScheduledActionCommand`, `RegisterScalableTargetCommand`, and `PutScalingPolicyCommand` from `@aws-sdk/client-application-auto-scaling` are correct command names. The `DynamoDBReadCapacityUtilization` and `DynamoDBWriteCapacityUtilization` predefined metric types are also correct.
- The "On-Demand" pricing in `ReservedCapacityAnalyzer` is actually the standard *provisioned* hourly rate (DynamoDB on-demand is priced per request, not per RCU-hour). The variable naming is slightly misleading, but the math is internally consistent as a "provisioned baseline vs. reserved" comparison — left as-is since reworking the variable names would exceed the scope of a technical-correctness pass.
- Reserved capacity in DynamoDB is purchased in 100-unit blocks with an upfront payment; the post's code presents the savings as a per-hour rate which simplifies the model but is reasonable for illustrative purposes.
- The throttling-retry handler's check on both `error.name` and `error.code` is correct for AWS SDK v3 (which sets `name`) while remaining backward compatible with v2 (`code`).
- The global tables capacity model (each region's WCUs must cover both local and replicated writes) is conceptually correct; AWS bills replicated writes as rWCUs at the same rate as WCUs.
