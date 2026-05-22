# Validation Summary: How to Use Terraform with Self-Service Infrastructure Portals

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform / HCL
- HCP Terraform / Terraform Cloud API
- AWS ECS
- AWS RDS
- Flask
- Python

## Sources Consulted
- HashiCorp HCP Terraform Workspaces API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspaces
- HashiCorp HCP Terraform Runs API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HashiCorp HCP Terraform Workspace Variables API: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/workspace-variables
- HashiCorp HCP Terraform run modes and auto-apply behavior: https://developer.hashicorp.com/terraform/cloud-docs/run/modes-and-options
- Terraform variable block validation documentation: https://developer.hashicorp.com/terraform/language/block/variable
- Terraform jsonencode function documentation: https://developer.hashicorp.com/terraform/language/functions/jsonencode
- Terraform conditional expressions documentation: https://developer.hashicorp.com/terraform/language/expressions/conditionals
- Terraform AWS provider aws_db_instance resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Amazon RDS CreateDBInstance API reference: https://docs.aws.amazon.com/AmazonRDS/latest/APIReference/API_CreateDBInstance.html

## Issues Found
- The Flask code used `os.environ` without importing `os`. Added `import os` so the snippet is syntactically complete.
- The RDS example allowed `redis` as a `database_engine`, but `aws_db_instance` and Amazon RDS `CreateDBInstance` do not support `redis` as an RDS engine. Removed `redis` from the Terraform validation and portal catalog options.
- The production RDS configuration set `skip_final_snapshot = false` without a `final_snapshot_identifier`. Added a production-only final snapshot identifier because the AWS provider requires one when final snapshots are enabled.
- The generated RDS password could include characters that Amazon RDS master passwords reject. Added `override_special` to keep generated special characters within the allowed set.
- The portal catalog included a `static-site` service, but the provisioning code assumed every catalog item used `service_name`. Added a `name_field` per catalog item and used it when building the workspace name and response message.
- The Terraform Cloud workspace creation payload configured a VCS repository without a VCS connection token ID. Added `TFC_OAUTH_TOKEN_ID` and `oauth-token-id`, which the Workspaces API requires when adding an OAuth VCS repository.
- The run creation payload included `auto-apply` as a create-run attribute. Removed it from the run request because auto-apply is a workspace/run-mode behavior, not a documented create-run request attribute.
- The variable creation helper marked list and dict values as HCL but serialized them using Python's string representation. Changed the helper to use `json.dumps` for list and dict values so the submitted value is valid expression syntax for HCL-enabled variables.
- The production approval snippet called `do_provision` without explaining that the original provisioning body must be moved into that helper. Added a short lead-in sentence to make the code example accurate.

## Review Notes
The Terraform module snippets still rely on surrounding resources and data sources not shown in the article, such as ECS cluster, subnet, IAM, ECR, security group, target group, CloudWatch log group, and region data sources. That is acceptable for a focused article excerpt, but a production-ready module would need those declarations plus stronger request validation, API error handling, workspace uniqueness handling, and secrets handling.
