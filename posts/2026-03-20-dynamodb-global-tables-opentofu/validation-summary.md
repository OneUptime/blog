# Validation Summary: How to Create DynamoDB Global Tables with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS DynamoDB
- DynamoDB Global Tables
- AWS IAM
- Amazon CloudWatch
- AWS CLI

## Sources Consulted
- OpenTofu CLI docs: https://opentofu.org/docs/cli/commands/
- OpenTofu `init` docs: https://opentofu.org/docs/cli/init/
- OpenTofu `plan` docs: https://opentofu.org/docs/cli/commands/plan/
- OpenTofu `apply` docs: https://opentofu.org/docs/v1.11/cli/commands/apply/
- AWS provider `aws_dynamodb_table` resource docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown
- DynamoDB global tables how it works: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/V2globaltables_HowItWorks.html
- DynamoDB global table design guidance: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/bp-global-table-design.html
- DynamoDB global tables security: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables-security.html
- DynamoDB global tables requirements and best practices: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/globaltables_reqs_bestpractices.html
- DynamoDB read consistency: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html
- DynamoDB metrics and dimensions: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/metrics-dimensions.html
- AWS CLI `describe-table` docs: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/describe-table.html

## Issues Found
- The introduction described sub-second replication and last-writer-wins conflict resolution as if they applied to all global tables. AWS now documents both MREC and MRSC modes, so I scoped those statements to the default MREC mode and clarified that the timestamp used for conflict resolution is DynamoDB's internal timestamp.
- The `global_secondary_index` example used deprecated `hash_key` and `range_key` arguments. I replaced them with the current `key_schema` blocks documented by the AWS provider.
- The IAM policy was labeled as multi-region access, but it only granted permissions to the primary table ARN and its indexes. I updated it to include replica table ARNs and replica index ARNs as well, which matches AWS guidance that permissions must target the table resource ARN in each affected Region.
- The replica verification command depended on the caller's default AWS Region. I added `--region us-west-2`, which is one of the configured replica Regions in the example, so the command is directly runnable as written.
- The conclusion suggested routing traffic to a DynamoDB regional endpoint with Route 53 latency routing. AWS guidance says DynamoDB has no global endpoint and applications should use their local DynamoDB regional endpoint while user traffic is routed to regional application endpoints, so I corrected that wording.
- The prerequisites understated the permissions needed for a first deployment with customer-managed KMS keys. I expanded them to include KMS permissions and `iam:CreateServiceLinkedRole` for the first global table in the account.

## Review Notes
- The post demonstrates the default MREC global table model. DynamoDB also supports MRSC as of June 2025, but that mode has different behavior and constraints, so it was correct to keep the article focused on MREC after the wording was narrowed.
- The CloudWatch alarm example is technically valid for the `ReplicationLatency` metric and its `TableName` and `ReceivingRegion` dimensions, but it monitors only one receiving Region. Real deployments usually create one alarm per replica path they care about.
