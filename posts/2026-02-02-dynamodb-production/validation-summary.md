# Validation Summary: How to Set Up DynamoDB for Production

## Status
validated

## Post Type
Tutorial / Guide (production setup walkthrough with code, Terraform, and architecture diagrams)

## Technologies Covered
- Amazon DynamoDB (on-demand and provisioned capacity modes)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-dynamodb`, `@aws-sdk/lib-dynamodb`)
- Terraform / AWS provider (`aws_dynamodb_table`, `aws_appautoscaling_target`, `aws_appautoscaling_policy`, `aws_backup_plan`, `aws_backup_vault`, `aws_cloudwatch_metric_alarm`, IAM)
- Global Secondary Indexes (GSI)
- DynamoDB Accelerator (DAX)
- Point-in-Time Recovery (PITR) and AWS Backup
- CloudWatch metrics and alarms
- DynamoDB Transactions (`TransactWriteCommand`)
- Application Auto Scaling for DynamoDB

## Sources Consulted
- AWS DynamoDB Developer Guide: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/
- Terraform AWS Provider — `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform AWS Provider — `aws_appautoscaling_target` / `aws_appautoscaling_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_policy
- Terraform AWS Provider — `aws_backup_plan`, `aws_backup_vault`, `aws_backup_selection`
- AWS SDK for JavaScript v3 — DynamoDB DocumentClient docs: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-lib-dynamodb/
- DynamoDB CloudWatch metrics reference: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- DynamoDB error handling and retry guidance: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Programming.Errors.html
- DynamoDB Transactions API (`TransactWriteItems`, `TransactionCanceledException` cancellation reasons)
- AWS Backup service-role policy ARN: `arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup`

## Issues Found
- **Bug in `checkDAXHealth` (DAX client section):** The example called `docClient.send({ TableName, Key })` with a plain object. The AWS SDK v3 `DynamoDBDocumentClient.send()` requires a Command instance (e.g. `GetCommand`), so the call would throw at runtime. Fixed by importing `GetCommand` from `@aws-sdk/lib-dynamodb` and wrapping the request: `docClient.send(new GetCommand({ ... }))`.

## Review Notes
- Architecture description (replication across 3 AZs in a region, partition router model) and the on-demand vs. provisioned tradeoff table match AWS's published guidance.
- Terraform `aws_dynamodb_table` blocks — `hash_key`, `range_key`, `attribute`, `global_secondary_index` (with `projection_type` of `ALL` / `KEYS_ONLY`), `server_side_encryption`, `point_in_time_recovery`, `ttl`, `billing_mode = "PAY_PER_REQUEST"` / `"PROVISIONED"` — are all correct for current AWS provider releases.
- Application Auto Scaling configuration uses the correct `scalable_dimension` values (`dynamodb:table:ReadCapacityUnits`, `dynamodb:table:WriteCapacityUnits`) and predefined metric types (`DynamoDBReadCapacityUtilization`, `DynamoDBWriteCapacityUtilization`).
- The SDK v3 retry handling correctly identifies the documented retryable error names (`ProvisionedThroughputExceededException`, `ThrottlingException`, `RequestLimitExceeded`, `InternalServerError`, `ServiceUnavailable`) and uses `retryMode: 'adaptive'`, which is a valid SDK v3 option.
- Transaction cancellation reason code `ConditionalCheckFailed` matches the documented codes inside `TransactionCanceledException.CancellationReasons` (note: distinct from the standalone `ConditionalCheckFailedException` error name).
- CloudWatch alarm metrics (`ThrottledRequests`, `SystemErrors`, `ConsumedReadCapacityUnits`, `SuccessfulRequestLatency`) and dimensions (`TableName`, `Operation`, `GlobalSecondaryIndexName`) are valid in the `AWS/DynamoDB` namespace. Operators may want to also add `ReadThrottleEvents` / `WriteThrottleEvents` for finer-grained alerting, but this is a coverage suggestion, not a correctness issue.
- The DAX example loads the legacy `amazon-dax-client` package via an optional `require` with a try/catch fallback. That npm package was originally written for AWS SDK v2; a v3-compatible DAX client is needed to interoperate with `DynamoDBDocumentClient.from()` (different vendors have shipped these under varying names, so the post wisely degrades to the standard client when DAX is unavailable). The fallback path is correct; readers integrating DAX should select a v3-compatible DAX client for their environment.
- The composite-key `ConditionExpression: 'quantity >= :qty AND quantity > :zero'` is not wrong but is logically redundant when `:qty > 0`; left as-is since it is a defensive style choice, not a correctness bug.
- PITR's "35-day window" claim is accurate; AWS supports up to 35 days of point-in-time recovery retention.
