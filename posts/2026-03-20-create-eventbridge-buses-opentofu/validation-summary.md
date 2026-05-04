# Validation Summary: How to Create AWS EventBridge Event Buses with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS EventBridge (custom event buses, rules, targets, archives)
- AWS EventBridge Schemas (schema discovery)
- AWS IAM (cross-account roles and policies)
- AWS CloudWatch Events (legacy resource naming for EventBridge)

## Sources Consulted
- Terraform AWS provider docs: `aws_cloudwatch_event_bus` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_bus)
- Terraform AWS provider docs: `aws_cloudwatch_event_bus_policy` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_bus_policy)
- Terraform AWS provider docs: `aws_cloudwatch_event_archive` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_archive)
- Terraform AWS provider docs: `aws_schemas_discoverer` (https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/schemas_discoverer)
- Terraform AWS provider docs: `aws_cloudwatch_event_rule` and `aws_cloudwatch_event_target`
- Terraform AWS provider docs: `aws_iam_role`, `aws_iam_role_policy`
- AWS EventBridge documentation: cross-account event routing and event pattern syntax
- AWS IAM service principal reference (events.amazonaws.com for EventBridge)

## Issues Found
- **Archive `event_pattern` for "archive all events"**: The original code used `event_pattern = jsonencode({ source = [{ prefix = "" }] })` with a comment claiming "no filter". While the empty-prefix matcher is technically valid EventBridge syntax that matches anything, it is not the documented best practice and is misleading given the accompanying comment. Per the Terraform AWS provider documentation, `event_pattern` is optional and omitting it archives all events sent to the bus. **Fix**: Removed the `event_pattern` block from the archive resource and updated the inline comment to explain that omitting it archives everything.

## Review Notes
- All other resource names, argument names, and policy syntax are correct as of the current AWS Terraform provider.
- The `aws_cloudwatch_event_*` resources retain the legacy "cloudwatch_event" prefix even though the service has been rebranded to EventBridge — this is correct and a known quirk of the provider.
- The IAM service principal `events.amazonaws.com` (rather than `eventbridge.amazonaws.com`) is the correct one for EventBridge — also a legacy-naming quirk.
- The cross-account event-forwarding pattern (rule + target with `role_arn` pointing to a role with `events:PutEvents` on the destination bus) is the standard documented approach.
- `retention_days = 0` (not used here) means indefinite retention; the post correctly uses `30`.
- The post does not declare the variables it references (`var.source_account_id`, `var.central_account_id`); this is acceptable for a tutorial focused on the resources themselves but readers will need to declare those variables in their own configuration.
