# Validation Summary: How to Use Terraform with Webhook-Based Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HCP Terraform / Terraform Cloud API
- Terraform Enterprise provider (`tfe`)
- AWS API Gateway HTTP APIs
- AWS Lambda
- Python
- GitHub webhooks
- HMAC webhook signature verification
- Shell `curl`

## Sources Consulted
- HashiCorp Developer: HCP Terraform Runs API (`POST /runs`) - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/run
- HashiCorp Developer: HCP Terraform notification configurations - https://developer.hashicorp.com/terraform/cloud-docs/api-docs/notification-configurations
- HashiCorp Developer: Terraform provisioners and `local-exec` behavior - https://developer.hashicorp.com/terraform/language/provisioners
- Terraform Registry: AWS provider `aws_lambda_permission` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform Registry: AWS provider `aws_apigatewayv2_integration` resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- Terraform Registry: TFE provider `tfe_notification_configuration` resource - https://registry.terraform.io/providers/hashicorp/tfe/latest/docs/resources/notification_configuration
- AWS Documentation: HTTP API Lambda proxy integration payload format 2.0 - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS Documentation: Lambda Python runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-python.html
- GitHub Docs: Validating webhook deliveries - https://docs.github.com/en/webhooks/using-webhooks/validating-webhook-deliveries
- OneUptime related post link - https://oneuptime.com/blog/post/2025-12-20-terraform-pipeline-github-actions/view

## Issues Found
- The API Gateway output URL ended at `/webhook`, but the configured route is `POST /webhook/{source}`. Updated the output to include `/webhook/{source}` so the displayed endpoint matches the route.
- The Lambda handler verified signatures against `event["body"]` as a UTF-8 string only. API Gateway HTTP API payload format 2.0 can deliver base64-encoded bodies with `isBase64Encoded`, so the handler now decodes base64 bodies before HMAC verification and JSON parsing.
- The Lambda handler only read `x-webhook-signature`. GitHub's official webhook signature header is `X-Hub-Signature-256`, exposed lowercased by API Gateway HTTP API payload format 2.0. Updated the handler to accept `x-hub-signature-256` as well.
- The destroy-time `local-exec` provisioner referenced `var.deployment_webhook_url` directly. Destroy-time provisioners should rely on `self` data preserved in the resource state. Added `deployment_webhook_url` to `triggers` and changed the destroy command to reference `self.triggers.deployment_webhook_url`.

## Review Notes
- Terraform CLI is not installed in this environment, so I could not run `terraform fmt` or `terraform validate` locally.
- The `null_resource` examples remain technically valid, but HashiCorp's current provisioner guidance recommends using provisioners sparingly and using `terraform_data` for provisioner-only lifecycle hooks in newer configurations.
- The TFE notification example uses valid trigger names and destination types. For generic notifications, the configured `token` is used by HCP Terraform to generate an `X-TFE-Notification-Signature` HMAC-SHA512 header.
