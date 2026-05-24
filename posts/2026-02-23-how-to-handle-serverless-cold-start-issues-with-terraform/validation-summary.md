# Validation Summary: How to Handle Serverless Cold Start Issues with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- AWS Lambda (provisioned concurrency, SnapStart, layers, ARM64)
- AWS Application Auto Scaling (Lambda provisioned concurrency)
- AWS EventBridge / CloudWatch Events
- AWS CloudWatch (log metric filters, metric alarms)
- Azure Functions (Elastic Premium / EP1 plan)
- Azure App Service Plan (azurerm_service_plan)
- Google Cloud Functions (2nd gen)
- Node.js, Java runtimes

## Sources Consulted
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda runtime deprecation policy: https://docs.aws.amazon.com/lambda/latest/dg/runtime-support-policy.html
- Terraform AWS provider `aws_lambda_function`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform AWS provider `aws_lambda_provisioned_concurrency_config`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_provisioned_concurrency_config
- Terraform AWS provider `aws_appautoscaling_target` / `aws_appautoscaling_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appautoscaling_target
- AWS Lambda SnapStart docs: https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- Terraform AzureRM `azurerm_linux_function_app`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/linux_function_app
- Terraform AzureRM `azurerm_service_plan`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/service_plan
- Azure Functions Premium plan docs: https://learn.microsoft.com/en-us/azure/azure-functions/functions-premium-plan
- Terraform Google provider `google_cloudfunctions2_function`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloudfunctions2_function
- Google Cloud Functions runtimes: https://cloud.google.com/functions/docs/runtime-support

## Issues Found
- **Deprecated Node.js 18 runtimes**: The post used `nodejs18.x` for AWS Lambda, `nodejs18` for Google Cloud Functions, and `node_version = "18"` for Azure Functions. AWS Lambda Node.js 18 reached end-of-support on Oct 1, 2025 (block create) / Nov 1, 2025 (block update), and Azure Functions Node.js 18 reached end-of-support on Nov 30, 2025. As of the validation date (2026-05-24), these runtimes are no longer creatable. Updated all references to `nodejs22.x` / `nodejs22` / `"22"`, which are current supported LTS runtimes across all three platforms.

## Review Notes
- The `aws_lambda_provisioned_concurrency_config` resource supports the `timeouts` block in recent AWS provider versions — usage is correct.
- The Application Auto Scaling configuration (resource_id format `function:{name}:{qualifier}`, `scalable_dimension = "lambda:function:ProvisionedConcurrency"`, `service_namespace = "lambda"`, predefined metric `LambdaProvisionedConcurrencyUtilization`) all match AWS docs.
- The SnapStart configuration (`apply_on = "PublishedVersions"`) and Java 21 runtime are both valid; SnapStart now supports Python and .NET as well, but that is out of scope for the post.
- The CloudWatch log filter pattern `"REPORT RequestId Init Duration"` is a reasonable heuristic for cold-start detection since Lambda only emits the `Init Duration` field on cold-started invocations.
- For Azure Functions on Elastic Premium plans, `always_on = true` is accepted by the provider, though Microsoft generally states it is not required on EP plans (Premium plan keeps workers warm via `elastic_instance_minimum`). The author's combination is valid Terraform but slightly redundant — left as written.
- The Google Cloud Functions Gen2 config (`min_instance_count`, `max_instance_count`, `available_memory = "512Mi"`, `max_instance_request_concurrency`) is all valid per current Google provider docs.
