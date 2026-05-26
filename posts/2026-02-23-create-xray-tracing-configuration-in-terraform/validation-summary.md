# Validation Summary: How to Create X-Ray Tracing Configuration in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- HashiCorp AWS Provider
- AWS X-Ray
- AWS KMS
- AWS IAM
- Amazon API Gateway REST APIs and HTTP APIs
- AWS Lambda
- Amazon ECS / Fargate
- OpenTelemetry

## Sources Consulted
- HashiCorp Terraform AWS Provider: `aws_xray_encryption_config` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/xray_encryption_config
- HashiCorp Terraform AWS Provider: `aws_xray_group` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/xray_group
- HashiCorp Terraform AWS Provider: `aws_api_gateway_stage` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/api_gateway_stage
- HashiCorp Terraform AWS Provider: `aws_apigatewayv2_stage` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_stage
- HashiCorp Terraform AWS Provider: `aws_lambda_function` tracing configuration - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS X-Ray sampling rules documentation - https://docs.aws.amazon.com/xray/latest/devguide/xray-console-sampling.html
- AWS X-Ray filter expressions documentation - https://docs.aws.amazon.com/xray/latest/devguide/xray-console-filters.html
- AWS X-Ray encryption documentation - https://docs.aws.amazon.com/xray/latest/devguide/xray-console-encryption.html
- AWS X-Ray API configuration documentation - https://docs.aws.amazon.com/xray/latest/devguide/xray-api-configuration.html
- Amazon API Gateway X-Ray tracing for REST APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-xray.html
- Amazon API Gateway REST API vs HTTP API feature comparison - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-vs-rest.html
- AWS X-Ray daemon documentation - https://docs.aws.amazon.com/xray/latest/devguide/xray-daemon.html
- AWS managed policy `AWSXRayDaemonWriteAccess` - https://docs.aws.amazon.com/aws-managed-policy/latest/reference/AWSXRayDaemonWriteAccess.html
- AWS X-Ray SDK and daemon support timeline - https://docs.aws.amazon.com/xray/latest/devguide/xray-sdk-daemon-timeline.html

## Issues Found
- The API Gateway REST API and HTTP API stage examples included `access_log_settings` blocks without the required `format` argument. Added JSON access log formats that include `$context.requestId` and related request fields.
- The HTTP API example implied that X-Ray tracing is configured differently for API Gateway V2. AWS documents that HTTP APIs do not support AWS X-Ray tracing. Updated the note to clarify that the example enables detailed CloudWatch route metrics, not X-Ray tracing.
- The external dependency X-Ray group used wildcard service names in an `edge()` filter. AWS documents `edge(source, destination)` with concrete service names or IDs. Replaced it with a concrete edge-filter example.
- The ECS X-Ray daemon sidecar example did not attach X-Ray write permissions to the ECS task role. Added an `aws_iam_role_policy_attachment` using the existing `aws_iam_policy.xray_write` policy.
- The post recommended X-Ray SDK/daemon usage without noting the current support status. AWS placed the X-Ray SDKs and daemon in maintenance mode on February 25, 2026 and recommends OpenTelemetry for new instrumentation. Updated the prerequisites, ECS section, and best practice note accordingly.

## Review Notes
The Terraform snippets are illustrative and still reference surrounding resources that are not defined in the article, such as API Gateway deployments, CloudWatch log groups, Lambda roles, and ECS roles. A complete production module would also configure API Gateway CloudWatch logging permissions and prefer tighter KMS/IAM conditions where appropriate.
