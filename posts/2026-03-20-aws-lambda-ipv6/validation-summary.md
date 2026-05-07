# Validation Summary: How to Configure IPv6 for AWS Lambda

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Lambda
- AWS Lambda Function URLs
- Amazon VPC
- IPv6
- API Gateway HTTP APIs
- Terraform AWS Provider
- Node.js
- AWS CLI

## Sources Consulted
- AWS Lambda Developer Guide: Invoking Lambda function URLs - https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html
- AWS Lambda Developer Guide: Control access to Lambda function URLs - https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- AWS Lambda Developer Guide: Giving Lambda functions access to resources in an Amazon VPC - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS Lambda Developer Guide: Enable internet access for VPC-connected Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc-internet.html
- AWS Lambda API Reference: VpcConfig - https://docs.aws.amazon.com/lambda/latest/api/API_VpcConfig.html
- AWS CLI Command Reference: create-function-url-config - https://docs.aws.amazon.com/cli/latest/reference/lambda/create-function-url-config.html
- AWS CLI Command Reference: update-function-configuration - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-configuration.html
- AWS CLI Command Reference: create-api - https://docs.aws.amazon.com/cli/latest/reference/apigatewayv2/create-api.html
- API Gateway Developer Guide: IP address types for HTTP APIs in API Gateway - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-ip-address-type.html
- API Gateway API Reference: EndpointConfiguration - https://docs.aws.amazon.com/apigateway/latest/api/API_EndpointConfiguration.html
- Amazon VPC User Guide: Enable outbound IPv6 traffic using an egress-only internet gateway - https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- Terraform Registry: aws_lambda_function - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- Terraform Registry: aws_lambda_function_url - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function_url
- Node.js Documentation: HTTPS - https://nodejs.org/download/release/v22.12.0/docs/api/https.html

## Issues Found
- The post described Lambda Function URLs as if they required a configurable "dualstack mode." I corrected this to reflect that Function URLs are dual-stack by default and removed the misleading update step.
- The AWS CLI Function URL example omitted the required resource-based permissions for a public `NONE` auth type URL. I added the two `aws lambda add-permission` commands required for `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction`.
- The introduction and VPC sections implied Lambda works with IPv6-only subnets/VPC environments. I corrected this to match AWS documentation: outbound IPv6 is supported for VPC-connected functions only on dual-stack subnets with `Ipv6AllowedForDualStack` enabled.
- The Terraform `aws_lambda_function` example was missing `ipv6_allowed_for_dual_stack = true` in `vpc_config`. I added it because dual-stack subnets alone are not sufficient for Lambda outbound IPv6.
- The API Gateway section incorrectly stated that API Gateway does not natively support IPv6 and required CloudFront. I updated it to use API Gateway HTTP API dual-stack support via `--ip-address-type dualstack`.
- The shell verification snippet suggested using `curl` from inside the Lambda runtime. I replaced that with the required Lambda VPC IPv6 configuration command because relying on `curl` in the runtime is not a reliable configuration example.
- The conclusion overstated that IPv6 behavior depends entirely on VPC/subnet configuration. I corrected it to include the Lambda function's `Ipv6AllowedForDualStack` VPC setting and removed the claim that CloudFront is required for IPv6.

## Review Notes
- The example Node.js code is syntactically valid, and `family: 6` is supported by Node's HTTPS client for IPv6 address resolution.
- The external endpoint `ipv6.icanhazip.com` is plausible for testing, but its availability is outside AWS documentation guarantees.
- AWS CLI was not installed in the local environment during review, so command validation was performed against the official AWS CLI command reference.
