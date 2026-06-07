# Validation Summary: How to Implement Message Deduplication in SQS

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- Amazon SQS (Standard and FIFO queues)
- AWS SDK for JavaScript v3 (`@aws-sdk/client-sqs`, `@aws-sdk/client-dynamodb`, `@aws-sdk/client-cloudwatch`)
- AWS CDK v2 (`aws-cdk-lib/aws-sqs`, `aws-cdk-lib/aws-dynamodb`)
- Amazon DynamoDB (with TTL and conditional writes)
- Redis / ioredis (SET NX EX, pipelines)
- Prisma ORM
- Amazon CloudWatch metrics
- Node.js / JavaScript

## Sources Consulted
- AWS SQS — Exactly-once processing: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- AWS SQS SendMessage API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html
- AWS SQS High Throughput FIFO docs: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/high-throughput-fifo.html
- AWS CDK v2 `aws_sqs.QueueProps`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_sqs.QueueProps.html
- AWS CDK v2 `aws_dynamodb.TableProps`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableProps.html
- ioredis README (SET options, pipeline behavior): https://github.com/redis/ioredis
- Redis SET command reference (NX/EX return values): https://redis.io/commands/set/
- Prisma `update` vs. `updateMany` (where input typing): https://www.prisma.io/docs/orm/reference/prisma-client-reference#update
- Prisma error reference (P2002): https://www.prisma.io/docs/orm/reference/error-reference

## Issues Found
1. **Missing `Duration` import in the CDK FIFO queue example.** The original snippet used `Duration.seconds(300)` for `visibilityTimeout` but only imported `Stack` from `aws-cdk-lib`. Added `Duration` to the destructured `require('aws-cdk-lib')` so the example actually compiles.
2. **Deprecated `pointInTimeRecovery` prop on `aws-cdk-lib/aws-dynamodb` `Table`.** Replaced `pointInTimeRecovery: true` with the current `pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }` form to match the current CDK v2 API surface.
3. **Prisma `update()` called with a non-unique compound `where` (`{ orderId, status: 'pending' }`).** Prisma's `update` requires a `WhereUniqueInput`, so this would throw `PrismaClientValidationError` at runtime. Switched to `updateMany`, which accepts the full `WhereInput` (orderId + status filter) and is the correct primitive for a conditional status transition. Added a short inline comment explaining why.

## Review Notes
- The "300–3000 msgs/sec" FIFO throughput figure is accurate for default FIFO and is the AWS-documented default, but it is now a *per-partition* limit when high-throughput FIFO is enabled, and aggregate throughput can be substantially higher in supported regions. The post does not claim these are absolute upper limits, so I left the number as-is, but a future revision could mention high-throughput FIFO mode for completeness.
- The AWS SDK v3 SQS, DynamoDB, and CloudWatch imports, command names, and option shapes (`SendMessageCommand`, `PutItemCommand`, `ConditionalCheckFailedException`, `DeleteMessageBatchCommand`'s 10-message limit, etc.) are all current and correct.
- ioredis usage (`set(key, value, 'EX', seconds, 'NX')` returning `'OK'` / `null`, `exists` returning `0`/`1`, pipeline `[err, result]` tuples) matches the library's documented behavior.
- The CDK Queue example references `this.dlq` for the dead-letter queue without showing it being declared in the same snippet — that's a minor pedagogical gap, not a technical inaccuracy, so it was left alone.
- The `DeleteMessageBatchCommand` is used inside `BatchConsumer.deleteMessages` without an explicit `require` in that snippet; since each code block in the post is illustrative rather than a single runnable file, this matches the rest of the post's style and was not changed.
