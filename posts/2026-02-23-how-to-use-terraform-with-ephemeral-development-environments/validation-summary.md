# Validation Summary: How to Use Terraform with Ephemeral Development Environments

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- Terraform CLI workspaces
- Terraform provisioners
- AWS ECS and Fargate
- AWS Resource Groups Tagging API
- GitHub Actions
- actions/github-script
- Python boto3

## Sources Consulted
- Terraform `replace` function documentation: https://developer.hashicorp.com/terraform/language/functions/replace
- Terraform `timestamp` function documentation: https://developer.hashicorp.com/terraform/language/functions/timestamp
- Terraform `timeadd` function documentation: https://developer.hashicorp.com/terraform/language/functions/timeadd
- Terraform provisioner documentation: https://developer.hashicorp.com/terraform/language/provisioners
- Terraform CLI `apply` documentation: https://developer.hashicorp.com/terraform/cli/commands/apply
- Terraform CLI workspace select documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/select
- Terraform CLI workspace delete documentation: https://developer.hashicorp.com/terraform/cli/commands/workspace/delete
- Terraform CLI environment variable documentation: https://developer.hashicorp.com/terraform/cli/config/environment-variables
- AWS ECS service definition parameter documentation: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/service_definition_parameters.html
- Terraform AWS provider `aws_ecs_service` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecs_service
- boto3 Resource Groups Tagging API `get_resources` documentation: https://docs.aws.amazon.com/boto3/latest/reference/services/resourcegroupstaggingapi/client/get_resources.html
- GitHub Actions events documentation: https://docs.github.com/actions/reference/events-that-trigger-workflows
- GitHub Actions secure use documentation: https://docs.github.com/en/actions/reference/security/secure-use
- actions/github-script documentation: https://github.com/actions/github-script
- Python `datetime.fromisoformat` documentation: https://docs.python.org/3/library/datetime.html#datetime.datetime.fromisoformat

## Issues Found
- The database comment said the example created a separate schema, but the SQL creates a separate PostgreSQL database. Updated the comment to "separate database."
- The destroy-time provisioner referenced external data directly. Terraform destroy-time provisioners should rely on the resource's own attributes through `self`, so the database host and name are now stored in `triggers` and referenced through `self.triggers`.
- The preview URL output used the branch-derived environment name, while the GitHub Actions comment used the pull request workspace name. Updated the output to use `terraform.workspace`, matching the workflow URL pattern.
- The GitHub Actions Terraform step interpolated pull request context directly into a shell command. Updated it to pass Terraform variables through `TF_VAR_` environment variables, following GitHub's guidance for handling untrusted context values in shell steps.
- The destroy workflow did not provide required Terraform input variables. Added the same `TF_VAR_` values to the destroy step so Terraform can evaluate the configuration during destroy.
- The cleanup script searched EC2 instances even though the Terraform example creates an ECS service. Replaced the EC2 lookup with the AWS Resource Groups Tagging API so it can find tagged ephemeral resources more generally.
- The cleanup script used the branch name as the Terraform workspace, but the workflow creates workspaces named `pr-<number>`. Added a `Workspace` tag and updated cleanup to select that workspace.
- The cleanup script could attempt to destroy the same workspace multiple times if several tagged resources belonged to one environment. Added workspace de-duplication.
- The cleanup script ran Terraform from the script's current working directory, not the Terraform configuration directory. Added `cwd="infrastructure/ephemeral"` to Terraform subprocess calls.
- The cleanup script destroyed infrastructure but left expired Terraform workspaces behind. Added workspace selection back to `default` and workspace deletion after destroy.
- The `github-script` comment call was not awaited. Added `await` to match the async usage pattern documented by `actions/github-script`.

## Review Notes
Terraform and AWS CLI were not installed in the local environment, so CLI execution could not be tested locally. The review used official documentation plus static validation of the snippets. The examples still assume supporting Terraform configuration exists for referenced data sources, security groups, task definitions, provider configuration, and AWS credentials.
