# Validation Summary: How to Set Up IAM Policies for DynamoDB Table Access

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Identity and Access Management (IAM)
- Amazon DynamoDB
- DynamoDB Streams
- AWS Lambda execution roles
- Terraform AWS provider
- CloudWatch Logs IAM permissions

## Sources Consulted
- AWS DynamoDB Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazondynamodb.html
- AWS DynamoDB Developer Guide, "How Amazon DynamoDB works with IAM": https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/security_iam_service-with-iam.html
- AWS DynamoDB Developer Guide, "Using IAM policy conditions for fine-grained access control": https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/specifying-conditions.html
- AWS IAM User Guide, "AWS global condition context keys": https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS IAM User Guide, "IAM policy elements: Variables and tags": https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_variables.html
- AWS IAM User Guide, "Pass session tags in AWS STS": https://docs.aws.amazon.com/IAM/latest/UserGuide/id_session-tags.html
- Terraform Registry, AWS provider `aws_iam_policy` and `aws_iam_role_policy_attachment` resources: https://registry.terraform.io/providers/hashicorp/aws/latest/docs

## Issues Found
- The multi-tenant `dynamodb:LeadingKeys` example included `dynamodb:Scan`. AWS documents that `Scan` returns items regardless of leading keys and the DynamoDB authorization reference does not list `dynamodb:LeadingKeys` as a condition key for `Scan`. Removed `dynamodb:Scan` from that tenant-isolation policy.
- The attribute-level example used `StringEqualsIfExists` for `dynamodb:Select` while the text said users must request specific projected attributes. AWS documentation recommends requiring `SPECIFIC_ATTRIBUTES` for read-only attribute restrictions, because omitted projection/select parameters can otherwise return all attributes. Changed the condition operator to `StringEquals`.
- The DynamoDB Streams example put `dynamodb:ListStreams` in the same statement as stream-ARN-scoped actions. AWS lists `ListStreams` without a resource type, so it must be granted on `"Resource": "*"`. Split it into a separate statement.

## Review Notes
The remaining IAM JSON examples are syntactically valid and match current DynamoDB action/resource patterns. The Terraform snippet uses current `jsonencode`, `aws_iam_policy`, and `aws_iam_role_policy_attachment` patterns. Fine-grained access control examples assume the table partition key values are designed to match the IAM variable or principal tag values used in the policy.
