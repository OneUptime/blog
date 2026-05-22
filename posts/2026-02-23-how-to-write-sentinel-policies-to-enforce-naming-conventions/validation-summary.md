# Validation Summary: How to Write Sentinel Policies to Enforce Naming Conventions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HashiCorp Sentinel
- Terraform / HCP Terraform policy enforcement
- Sentinel `tfplan/v2`, `tfconfig/v2`, and `tfrun` imports
- AWS resource naming conventions for S3, EC2 security groups, IAM roles, IAM policies, and related resources

## Sources Consulted
- HashiCorp Sentinel language specification: https://developer.hashicorp.com/sentinel/docs/language/spec
- HashiCorp Sentinel `test` command documentation: https://developer.hashicorp.com/sentinel/docs/commands/test
- HashiCorp Terraform `tfplan/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfplan-v2
- HashiCorp Terraform `tfconfig/v2` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfconfig-v2
- HashiCorp Terraform `tfrun` Sentinel import reference: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/policy-enforcement/import-reference/tfrun
- HashiCorp Terraform configuration syntax documentation: https://developer.hashicorp.com/terraform/language/syntax/configuration
- AWS S3 bucket naming rules: https://docs.aws.amazon.com/AmazonS3/latest/userguide/bucketnamingrules.html

## Issues Found
- The Sentinel code examples were marked with `python` code fences. I changed them to `sentinel` so the snippets are identified as the correct language.
- The first example described lowercase underscores as a Terraform convention. Terraform identifiers can include letters, digits, underscores, and hyphens, so I changed the wording to describe this as the organization's chosen convention.
- Several `tfplan/v2` examples directly selected optional fields such as `tags`, `bucket`, `name`, and `description`. Sentinel returns `undefined` for missing values, and the language specification documents the `else` operator for defaulting `undefined` values. I added `else null` or `else {}` where needed so the example policies handle resources without those optional fields correctly.

## Review Notes
The examples are organization-specific naming policies, so the regular expressions intentionally enforce stricter rules than the cloud providers or Terraform itself require. The S3 example is stricter than AWS's full bucket-name grammar because it encodes a custom company pattern, but it remains compatible with AWS bucket naming constraints for the shown examples. The two related OneUptime blog links at the end of the post resolve successfully.
