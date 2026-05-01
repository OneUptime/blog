# Validation Summary: How to Configure DynamoDB Local Secondary Indexes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS DynamoDB
- AWS CLI
- HashiCorp AWS provider
- HCL

## Sources Consulted
- AWS DynamoDB Developer Guide: Local secondary indexes - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LSI.html
- AWS DynamoDB Developer Guide: DynamoDB read consistency - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- AWS DynamoDB Developer Guide: Working with Local Secondary Indexes in DynamoDB AWS CLI - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LCICli.html
- AWS DynamoDB Developer Guide: Constraints in Amazon DynamoDB - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Constraints.html
- AWS CLI Command Reference: `dynamodb query` - https://docs.aws.amazon.com/cli/latest/reference/dynamodb/query.html
- OpenTofu CLI docs: `init`, `plan`, and `apply` - https://opentofu.org/docs/cli/init/ , https://opentofu.org/docs/cli/commands/plan/ , https://opentofu.org/docs/v1.11/cli/commands/apply/
- HashiCorp AWS provider docs: `aws_dynamodb_table` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown

## Issues Found
- The introduction said LSIs are "strongly consistent by default." AWS documents that reads from tables and LSIs are eventually consistent by default, and strong consistency is only used when `ConsistentRead` is set to `true`. I corrected the introduction to say LSIs support strongly consistent reads.
- The second index comment said the LSI would sort by `activityType`, then by `timestamp`. An LSI has exactly one alternate sort key, and this index uses only `activityType` as that key. I corrected the comment so it no longer implies a secondary sort order that DynamoDB does not provide.
- The conclusion repeated the same consistency issue. I changed it to state that LSIs support strongly consistent reads when `ConsistentRead` is enabled.

## Review Notes
- The HCL syntax for `aws_dynamodb_table` and `local_secondary_index` is valid against current AWS provider documentation, including `projection_type`, `range_key`, `non_key_attributes`, and `point_in_time_recovery`.
- The AWS CLI query example is valid: `--index-name`, `--key-condition-expression`, `--expression-attribute-values`, and `--scan-index-forward false` all match current AWS CLI documentation.
- DynamoDB enforces the 10 GB item collection limit across the base table and all LSIs sharing a partition key value; the post's warning about monitoring item collection size is correct.
- Changing LSIs after a table is created is force-new behavior in the AWS provider, so applying such a change later would recreate the table rather than modify it in place.
