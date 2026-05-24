# Validation Summary: How to Create Keyspaces (Managed Cassandra) in Terraform

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Terraform (HashiCorp AWS provider ~> 5.0)
- Amazon Keyspaces (managed Apache Cassandra)
- Apache Cassandra (CQL data types, partition/clustering keys)
- AWS KMS (customer-managed keys, key policies)
- AWS IAM (policies, Cassandra service actions)
- Amazon CloudWatch (alarms, AWS/Cassandra namespace)
- Amazon SNS (alerting)

## Sources Consulted
- Terraform `aws_keyspaces_keyspace` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/keyspaces_keyspace
- Terraform `aws_keyspaces_table` resource docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/keyspaces_table
- AWS Service Authorization Reference for Keyspaces (IAM actions, ARN formats): https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonkeyspacesforapachecassandra.html
- AWS Keyspaces CloudWatch metrics & dimensions: https://docs.aws.amazon.com/keyspaces/latest/devguide/metrics-dimensions.html
- AWS Keyspaces customer-managed KMS keys docs: https://docs.aws.amazon.com/keyspaces/latest/devguide/encryption.customermanaged.html

## Issues Found
No technical issues found.

All verified items:
- `aws_keyspaces_keyspace` arguments (`name`, `tags`) and the exported `arn` attribute are correct.
- `aws_keyspaces_table` schema_definition with `column`, `partition_key`, `clustering_key` blocks is correct.
- `capacity_specification` with `throughput_mode = "PAY_PER_REQUEST"` / `"PROVISIONED"`, plus `read_capacity_units` / `write_capacity_units`, is correct.
- `encryption_specification` `type` values (`AWS_OWNED_KMS_KEY`, `CUSTOMER_MANAGED_KMS_KEY`) and `kms_key_identifier` argument are correct.
- `point_in_time_recovery.status`, `ttl.status`, and `default_time_to_live` (seconds) are correct.
- `clustering_key.order_by` accepts `ASC`/`DESC`.
- KMS service principal `cassandra.amazonaws.com` is correct.
- CloudWatch namespace `AWS/Cassandra`, metric `ConsumedReadCapacityUnits`, and `Keyspace`/`TableName` dimensions are valid.
- IAM action prefix `cassandra:` and all listed actions (Select, Modify, Create, Drop, Alter, TagResource, UntagResource) are valid.
- The ARN wildcard pattern `"${aws_keyspaces_keyspace.x.arn}/*"` correctly matches table ARNs because keyspace ARNs end with `/keyspace/{name}/` and table ARNs extend that path with `table/{name}`.

## Review Notes
- The post comments the `events` table's partition key and clustering key as "Composite" — strictly speaking, a composite partition key requires more than one `partition_key` block. As written there is a single partition key and a compound clustering key. The comments are slightly imprecise wording but do not constitute a technical/syntactic error in the Terraform code itself, so no edit was made.
- AWS recommends pairing the KMS key policy with a `kms:ViaService` condition of `cassandra.*.amazonaws.com` for additional restriction; this is an optional hardening step and the post's policy is functional as written.
- `default_time_to_live` max value is 630720000 seconds (20 years); the example uses 86400 which is well within bounds.
