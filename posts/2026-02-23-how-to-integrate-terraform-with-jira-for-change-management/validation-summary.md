# Validation Summary: How to Integrate Terraform with Jira for Change Management

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- Terraform
- Terraform `null_resource` and `local-exec` provisioners
- Jira Cloud REST API v3
- Jira Query Language (JQL)
- Atlassian Document Format
- AWS CodeBuild
- AWS Secrets Manager environment variables in CodeBuild
- Bash, curl, jq, and Python helper scripts

## Sources Consulted
- Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform `null_resource` documentation: https://registry.terraform.io/providers/hashicorp/null/latest/docs/resources/resource.html
- Jira Cloud REST API basic authentication: https://developer.atlassian.com/cloud/jira/platform/basic-auth-for-rest-apis/
- Jira Cloud REST API create issue documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/
- Jira Cloud REST API issue search documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-search/
- Atlassian support note on `/rest/api/3/search` removal: https://confluence.atlassian.com/jirakb/run-jql-search-query-using-jira-cloud-rest-api-1289424308.html
- Jira Cloud REST API attachment documentation: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issue-attachments/
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild runtime and image documentation: https://docs.aws.amazon.com/codebuild/latest/userguide/available-runtimes.html
- Terraform AWS provider `aws_codebuild_project` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/codebuild_project

## Issues Found
- The first Terraform snippet referenced `var.environment` without defining it. Added an `environment` variable so the snippet is internally consistent.
- The text said Terraform would create Jira tickets when changes are planned, but the shown `local-exec` provisioner runs during Terraform apply resource creation. Updated the wording to say it runs as part of an apply workflow.
- The reusable module comment said the ticket was updated after a successful apply, but that `null_resource` only represents the shown Terraform-managed step unless other resources explicitly depend on it. Adjusted the comment to avoid overstating the lifecycle.
- The CodeBuild example used `type = "SECRETS_MANAGER"` with a variable named like a raw API token. AWS provider documentation says the value for a Secrets Manager environment variable should be a secret identifier, so the example now uses `var.jira_api_token_secret_id` and defines it.
- The CodeBuild example hard-coded `hashicorp/terraform:latest` while the buildspec also runs Python helper scripts and shell tools. Replaced it with a `codebuild_image` variable documented as requiring Terraform, Python 3, curl, and jq.
- The change-history example used Jira Cloud's legacy `/rest/api/3/search` endpoint. Updated it to `/rest/api/3/search/jql`, the current enhanced JQL search endpoint.
- The change-history section described Terraform data sources, but the example used a `null_resource` with `local-exec`. Corrected the wording to "Terraform-managed helper command."

## Review Notes
Terraform was not installed in the local environment, so I could not run `terraform validate` against extracted snippets. The review was performed against official Terraform, Atlassian, and AWS documentation. The snippets remain illustrative and still depend on project-specific Jira workflow statuses, issue type names, permissions, helper scripts, and a CodeBuild image containing the required tools.
