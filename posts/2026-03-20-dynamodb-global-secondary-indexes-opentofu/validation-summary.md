# Validation Summary: How to Configure DynamoDB Global Secondary Indexes with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS provider for OpenTofu/Terraform
- Amazon DynamoDB
- AWS CLI

## Sources Consulted
- AWS provider `aws_dynamodb_table` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS provider source markdown for `aws_dynamodb_table` (used to inspect the current documented schema directly): https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/dynamodb_table.html.markdown
- DynamoDB developer guide, global secondary indexes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- DynamoDB developer guide, secondary indexes overview: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html
- DynamoDB quotas: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Limits.html
- DynamoDB API reference, `Projection`: https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Projection.html
- AWS CLI `dynamodb query` command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/query.html

## Issues Found
- The post used `hash_key` and `range_key` inside `global_secondary_index` blocks. In the current AWS provider documentation, those arguments are deprecated for GSIs, so I replaced them with the current `key_schema` form in all examples.
- The `OrdersByStatus` example listed `orderId` in `non_key_attributes`. DynamoDB documents `NonKeyAttributes` as non-key attributes only, and base table key attributes are already projected automatically, so I removed `orderId` and kept only `customerId` and `totalAmount`.
- The introduction said each GSI can have its own read/write capacity and that GSIs are eventually consistent "by default." I corrected this to match AWS documentation: GSIs inherit the base table's capacity mode, explicit per-index capacity settings apply on provisioned tables, and GSI reads are eventually consistent only.
- The AWS CLI example used unquoted `<table-name>`, which is shell redirection syntax in bash if copied literally. I replaced it with a concrete quoted example table name so the command is syntactically valid as written.
- The conclusion overstated `projection_type = "ALL"` as doubling storage and implied table-fetch behavior. I changed this to the documented behavior: `ALL` produces the largest index storage footprint, GSI queries cannot fetch non-projected attributes from the base table, and GSI write impact depends on whether the table write causes an index update.

## Review Notes
- The HCL examples are otherwise structurally correct for current provider documentation, including the requirement to define `attribute` blocks only for table and index key attributes.
- The post's stated limit of 20 GSIs per table is accurate as the current default quota.
- The post does not mention the DynamoDB limit of 100 total `NonKeyAttributes` across all `INCLUDE` projections on a table. That omission is acceptable for this scope, but it is a useful caveat for future expansion.
