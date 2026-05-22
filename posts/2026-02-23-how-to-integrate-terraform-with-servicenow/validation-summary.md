# Validation Summary: How to Integrate Terraform with ServiceNow

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Cloud run tasks
- ServiceNow REST APIs
- ServiceNow CMDB
- AWS Lambda
- Amazon EventBridge
- Shell scripting with curl and jq

## Sources Consulted
- HashiCorp Terraform provisioner documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform resource block reference: https://developer.hashicorp.com/terraform/language/resources/syntax
- HashiCorp HTTP provider documentation: https://registry.terraform.io/providers/hashicorp/http/latest/docs/data-sources/http
- HashiCorp AWS provider documentation for EventBridge rules and targets: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cloudwatch_event_rule
- HashiCorp AWS provider documentation for Lambda permissions: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- HashiCorp TFE provider documentation for workspace run tasks: https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/workspace_run_task
- HCP Terraform run tasks documentation: https://developer.hashicorp.com/terraform/cloud-docs/workspaces/settings/run-tasks
- HCP Terraform run task integration API: https://developer.hashicorp.com/terraform/enterprise/api-docs/run-tasks/run-tasks-integration
- ServiceNow Table API documentation: https://www.servicenow.com/docs/r/api-reference/rest-apis/c_TableAPI.html
- ServiceNow CMDB Instance API documentation: https://www.servicenow.com/docs/r/api-reference/rest-apis/cmdb-instance-api.html

## Issues Found
- The post recommended Terraform's HTTP provider for creating ServiceNow change requests. The HashiCorp HTTP provider is a data source, and its POST support is documented for read-only style requests rather than managing external records. Changed the recommendation to CI/CD, `local-exec`, or a custom provider.
- The ServiceNow instance variable was described as a URL, but examples interpolate it into `https://${var.servicenow_instance}`. Updated the description to make it a hostname.
- The CMDB Instance API example sent most CI fields at the top level. ServiceNow's CMDB Instance API expects CI fields in an `attributes` object, with source metadata outside that object. Updated the payload shape.
- The CMDB destroy example attempted to PATCH the CMDB Instance API collection endpoint and referenced `each.value` in a destroy-time provisioner. Updated it to look up a CI sys_id through the Table API and PATCH the specific record, using only `self.triggers.instance_id` as the Terraform destroy-time reference.
- The CMDB example labeled a security group ID as a VPC ID. Renamed the field to `security_group_id`.
- The EventBridge example implied AWS natively receives Terraform Cloud run failure events with source `app.terraform.io`. Updated the wording and event pattern to describe forwarded custom events from CI/CD or a Terraform Cloud notification webhook.
- The EventBridge-to-Lambda example omitted the Lambda invoke permission required for EventBridge. Added an `aws_lambda_permission` resource.
- The TFE provider snippet used the deprecated `stage` argument on `tfe_workspace_run_task`. Updated it to `stages = ["pre_apply"]`.
- The run task URL was shown as a fixed ServiceNow endpoint that could not be verified in official docs. Updated the snippet to use a configurable `var.servicenow_run_task_url`.

## Review Notes
The snippets remain illustrative and omit surrounding variables, provider declarations, IAM policies, and helper scripts. A production implementation should also prefer OAuth or a secrets manager over username/password interpolation, and should make CMDB upsert behavior explicit to avoid duplicate CIs.
