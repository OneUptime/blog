# Validation Summary: How to Use DynamoDB Global Tables for Multi-Region

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon DynamoDB Global Tables
- AWS CLI
- AWS CDK for TypeScript
- Python boto3
- Amazon CloudWatch metrics and alarms
- Route 53 latency-based routing

## Sources Consulted
- AWS DynamoDB Global Tables overview: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GlobalTables.html
- AWS DynamoDB Global Tables core concepts: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables-CoreConcepts.html
- AWS DynamoDB creating global tables tutorial: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables.tutorial.html
- AWS DynamoDB write modes with global tables: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-global-table-design.prescriptive-guidance.writemodes.html
- AWS DynamoDB throughput capacity planning for global tables: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-global-table-design.prescriptive-guidance.throughput.html
- AWS CLI `dynamodb create-table`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/create-table.html
- AWS CLI `dynamodb update-table`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- AWS CLI `dynamodb wait table-exists`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/wait/table-exists.html
- AWS CDK `TableV2`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableV2.html
- AWS DynamoDB CloudWatch metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- boto3 DynamoDB `Table.put_item`: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/put_item.html
- boto3 DynamoDB `Table.update_item`: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/update_item.html

## Issues Found
- The conflict-resolution section described last-writer-wins as applying to Global Tables generally. Updated it to specify that this applies to the default MREC mode, while MRSC handles concurrent writes with retryable conflict errors.
- The atomic-counter example claimed counters were safe across regions. Updated the text to explain that non-idempotent writes such as counters are safe only when writes for that item are routed to one region in MREC, or when using MRSC.
- The atomic-counter expression failed if `login_count` did not already exist. Updated it to use `if_not_exists(login_count, :zero) + :inc`.
- The conditional-write example implied that conditional writes alone solve cross-region conflicts in MREC. Updated the comment to clarify that MREC conditions should be evaluated in the item's write region so the condition checks the latest version.
- The conditional-write expression used `version` directly. Updated it to use an expression attribute name (`#v`) to avoid reserved-word ambiguity.
- The write and routing sections implied that all writes should go to the nearest region. Updated the wording to distinguish idempotent writes from non-idempotent MREC writes that need item-level write routing.

## Review Notes
The commands and snippets align with current AWS documentation for MREC global tables using AWS CLI `update-table`, DynamoDB Streams with `NEW_AND_OLD_IMAGES`, CDK `TableV2`, and CloudWatch `ReplicationLatency`. The local environment did not have the AWS CLI installed, so CLI verification was performed against official AWS CLI documentation rather than local `--help` output.
