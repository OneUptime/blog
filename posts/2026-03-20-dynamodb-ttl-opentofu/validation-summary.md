# Validation Summary: How to Configure DynamoDB TTL with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS DynamoDB
- DynamoDB Time to Live (TTL)
- DynamoDB Streams
- AWS Lambda event source mappings
- Python
- Boto3
- AWS CLI
- Amazon CloudWatch

## Sources Consulted
- AWS DynamoDB Developer Guide, "Using time to live (TTL) in DynamoDB": https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- AWS DynamoDB Developer Guide, "DynamoDB Streams and Time to Live": https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/time-to-live-ttl-streams.html
- AWS DynamoDB Developer Guide, "Working with expired items and time to live (TTL)": https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/ttl-expired-items.html
- AWS DynamoDB Developer Guide, "DynamoDB Metrics and dimensions": https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- AWS Lambda Developer Guide, "Control which events Lambda sends to your function": https://docs.aws.amazon.com/lambda/latest/dg/invocation-eventfiltering.html
- AWS Lambda Developer Guide, "Using event filtering with a DynamoDB event source": https://docs.aws.amazon.com/lambda/latest/dg/with-ddb-filtering.html
- AWS Lambda Developer Guide, "Lambda parameters for Amazon DynamoDB event source mappings": https://docs.aws.amazon.com/lambda/latest/dg/services-ddb-params.html
- AWS CLI Command Reference, `describe-time-to-live`: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-time-to-live.html
- Boto3 API Reference, `DynamoDB.Table.update_item()`: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/update_item.html
- OpenTofu docs, "Basic CLI Features": https://opentofu.org/docs/cli/commands/
- OpenTofu docs, "Initializing Working Directories": https://opentofu.org/docs/cli/init/
- OpenTofu docs, "Command: plan": https://opentofu.org/docs/cli/commands/plan/
- OpenTofu docs, "Command: apply": https://opentofu.org/docs/v1.11/cli/commands/apply/
- HashiCorp AWS provider docs source, `aws_dynamodb_table`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/dynamodb_table.html.markdown
- HashiCorp AWS provider docs source, `aws_lambda_event_source_mapping`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/lambda_event_source_mapping.html.markdown
- HashiCorp AWS provider docs source, `aws_cloudwatch_metric_alarm`: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/cloudwatch_metric_alarm.html.markdown

## Issues Found
- The introduction said TTL deletes items "without consuming write capacity units" and implied stream records always exist. AWS documents TTL as not consuming write throughput, and TTL deletions appear in DynamoDB Streams only when Streams are enabled. I corrected that wording.
- The Python `extend_session` example used `update_item` without a condition. Boto3 documents that `update_item` can create a new item if the key does not already exist, so the sample could create an incomplete session record instead of extending an existing one. I added a `ConditionExpression` that requires the session item to exist.
- The conclusion claimed TTL deletions happen within 48 hours and described them as simply free. AWS documents TTL deletion as typically occurring within a few days, and replicated TTL deletes in Global Tables can still incur replica-region write charges. I updated the timing and cost wording to match the documented behavior, and I tightened the strict-expiry guidance to cover scan and query results.

## Review Notes
- The `aws` CLI and `tofu` binary were not installed in this environment, so command validation was done against official command/reference documentation rather than local `--help` output.
- The OpenTofu/HCL snippets for `aws_dynamodb_table`, `aws_lambda_event_source_mapping`, and `aws_cloudwatch_metric_alarm` matched the current HashiCorp AWS provider documentation.
