# Validation Summary: How to Create DynamoDB with On-Demand Capacity in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HashiCorp AWS provider ~> 5.0)
- AWS DynamoDB (on-demand and provisioned capacity modes)
- DynamoDB Global Secondary Indexes (GSI)
- DynamoDB Local Secondary Indexes (LSI)
- DynamoDB TTL (Time to Live)
- DynamoDB server-side encryption
- Terraform variables and outputs

## Sources Consulted
- AWS DynamoDB Developer Guide — Considerations when switching capacity modes: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/switching.capacitymode.html
- Terraform AWS Provider — `aws_dynamodb_table` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- AWS DynamoDB Developer Guide — On-demand capacity mode reference
- AWS DynamoDB Developer Guide — Global and Local Secondary Indexes

## Issues Found
1. **Incorrect capacity-mode switching limit.** The original post stated: "You can switch from provisioned to on-demand once per day, and from on-demand to provisioned at any time." Per the current AWS documentation, you can switch from provisioned to on-demand **up to four times in a 24-hour rolling window**, and from on-demand to provisioned at any time. Updated the text to reflect the accurate limit.

## Review Notes
- All `aws_dynamodb_table` resource blocks use valid Terraform syntax for the AWS provider v5.x: `billing_mode = "PAY_PER_REQUEST"`, `hash_key`, `range_key`, `attribute` blocks with `name`/`type` (S/N/B), `global_secondary_index`, `local_secondary_index`, `ttl`, `server_side_encryption`, and `tags` are all correct.
- The claim that `read_capacity` / `write_capacity` are not required (and must be omitted) for `PAY_PER_REQUEST` mode is accurate, including for GSIs.
- The LSI example correctly uses `non_key_attributes` with `projection_type = "INCLUDE"`. LSIs do indeed need to be defined at table creation time — accurate.
- The TTL block uses the correct `attribute_name` and `enabled` arguments.
- The post recommends enabling point-in-time recovery as a best practice but does not show the `point_in_time_recovery` block in the production example. Not technically wrong, but could be expanded in a future revision.
- The `server_side_encryption { enabled = true }` enables encryption with an AWS-owned key by default. If readers want the AWS-managed KMS key (`alias/aws/dynamodb`) or a customer-managed key, they would need to add `kms_key_arn`. The post's comment "Enable server-side encryption with AWS-managed key" is slightly imprecise (it's AWS-owned by default), but the code itself is valid and behaves as DynamoDB's default encryption — left as-is since it is not strictly incorrect Terraform.
