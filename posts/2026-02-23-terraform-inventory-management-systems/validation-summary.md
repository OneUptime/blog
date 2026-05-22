# Validation Summary: How to Use Terraform with Inventory Management Systems

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform CLI and Terraform state JSON
- AWS provider resources for EC2 and RDS
- HCP Terraform / Terraform Enterprise run tasks
- TFE Terraform provider
- Python webhook and synchronization scripts
- AWS CLI and JMESPath queries
- jq

## Sources Consulted
- Terraform CLI `show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/show
- Terraform CLI `state show` command documentation: https://developer.hashicorp.com/terraform/cli/commands/state/show
- Terraform JSON output format documentation: https://developer.hashicorp.com/terraform/internals/json-format
- HCP Terraform run task integration documentation: https://developer.hashicorp.com/terraform/cloud-docs/integrations/run-tasks
- HCP Terraform run task integration API documentation: https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run-tasks/run-tasks-integration
- Terraform Enterprise run task stages and results API documentation: https://developer.hashicorp.com/terraform/enterprise/api-docs/run-tasks/run-task-stages-and-results
- TFE provider `tfe_organization_run_task` documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/organization_run_task
- TFE provider `tfe_workspace_run_task` documentation: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_run_task
- AWS provider `aws_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_db_instance` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/db_instance
- Terraform `terraform_data` resource documentation: https://developer.hashicorp.com/terraform/language/resources/terraform-data
- Terraform `local-exec` provisioner documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/local-exec
- AWS CLI `ec2 describe-instances` documentation: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-instances.html
- Python `datetime` deprecations documentation: https://docs.python.org/3.12/deprecations/

## Issues Found
- The AWS RDS example used `aws_rds_instance`, which is not the AWS provider resource type. Changed it to `aws_db_instance`, updated references in outputs and Python mapping, and added required RDS arguments such as `allocated_storage`, `username`, and password management.
- The Python sync script used `datetime.utcnow()`, which is deprecated in Python 3.12. Changed it to `datetime.now(timezone.utc)`.
- The TFE workspace run task example used the deprecated `stage` argument. Changed it to `stages = ["post_apply"]`.
- The run task webhook example returned the task result payload directly from the webhook handler. HCP Terraform expects the integration to PATCH the supplied `task_result_callback_url` using the supplied `access_token`, so the example now sends that callback and returns a simple HTTP response.
- The webhook HMAC check could raise an error when the signature header was missing. Added a missing-signature guard.
- The reconciliation script used `terraform state show -json`, but `terraform state show` does not support JSON output. Replaced it with `terraform show -json` and a `jq` query over the documented state JSON structure.
- The inventory-record module used `null_resource`; current Terraform documentation recommends `terraform_data` for this pattern. Changed the example to `terraform_data` with `triggers_replace`.

## Review Notes
Terraform and AWS CLI were not installed in the local workspace, so command behavior was verified against official documentation rather than local `--help` output. Python snippets and the Bash snippet were syntax-checked locally.
