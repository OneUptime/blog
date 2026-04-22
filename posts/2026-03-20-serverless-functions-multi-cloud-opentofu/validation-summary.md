# Validation Summary: How to Deploy Serverless Functions Across Multiple Clouds with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- AWS Lambda
- Azure Functions
- Terraform/OpenTofu provider configuration
- HashiCorp AWS provider
- HashiCorp AzureRM provider
- Infrastructure as Code

## Sources Consulted
- OpenTofu provider requirements documentation: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu provider configuration documentation: https://opentofu.org/docs/language/providers/configuration/
- OpenTofu providers within modules documentation: https://opentofu.org/docs/language/modules/develop/providers/
- OpenTofu CLI `init`, `plan`, and `apply` documentation: https://opentofu.org/docs/cli/init/, https://opentofu.org/docs/cli/commands/plan/, https://opentofu.org/docs/cli/commands/apply/
- HashiCorp AWS provider `aws_lambda_function` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_function.html.markdown
- AWS Lambda execution role documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-intro-execution-role.html
- AWS Lambda runtime support documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- HashiCorp AzureRM provider `azurerm_linux_function_app` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/linux_function_app.html.markdown
- HashiCorp AzureRM provider `azurerm_service_plan` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/service_plan.html.markdown
- HashiCorp AzureRM provider `azurerm_storage_account` documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/r/storage_account.html.markdown
- HashiCorp AzureRM provider 4.0 upgrade guide: https://raw.githubusercontent.com/hashicorp/terraform-provider-azurerm/main/website/docs/guides/4.0-upgrade-guide.html.markdown
- Microsoft Azure Functions supported languages documentation: https://learn.microsoft.com/en-us/azure/azure-functions/supported-languages

## Issues Found
- The description and introduction claimed the examples covered AWS, Azure, and GCP and used provider aliases, but the post only showed AWS and Azure modules and did not configure provider aliases. Updated the wording, provider configuration, and project tree to match the actual AWS/Azure examples.
- The root provider block used AzureRM 4.x-compatible provider requirements only after the review, but AzureRM 4.x requires an explicit subscription ID for plan/apply. Added `subscription_id = var.azure_subscription_id`.
- The child module snippets did not declare their own required providers. Added `required_providers` blocks to both modules, matching OpenTofu module guidance.
- The AWS Lambda module referenced `aws_iam_role.lambda_exec` without defining it. Added the Lambda execution role, trust policy, and `AWSLambdaBasicExecutionRole` attachment.
- The AWS Lambda snippet used a local ZIP file without a source hash, so code package changes might not be detected. Added `source_code_hash = filebase64sha256(var.zip_path)`.
- The Azure Function module referenced a service plan and storage account without defining them. Added `azurerm_service_plan` and `azurerm_storage_account` resources.
- The Azure Function example did not deploy a function package. Added `zip_deploy_file = var.zip_path` and `WEBSITE_RUN_FROM_PACKAGE = "1"`, as required by the AzureRM resource documentation.
- The Azure module call did not pass the storage account name or ZIP path required by the corrected module. Added `storage_account_name` and `zip_path`.

## Review Notes
Neither `tofu` nor `terraform` is installed in this workspace, so local CLI validation could not be run. The review was completed by checking the snippets against official OpenTofu, AWS, HashiCorp provider, and Microsoft Azure documentation. The example Azure storage account name must still be globally unique in real deployments, and `function.zip` must contain a valid package for each provider.
