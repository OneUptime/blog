# Validation Summary: How to Create Lambda Function URLs in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- AWS Lambda
- Lambda Function URLs
- AWS IAM and Lambda resource-based policies
- AWS Signature Version 4
- Lambda response streaming
- Amazon CloudFront
- CORS
- Node.js Lambda handlers
- Python boto3/botocore request signing

## Sources Consulted
- AWS Lambda Developer Guide: Control access to Lambda function URLs - https://docs.aws.amazon.com/lambda/latest/dg/urls-auth.html
- AWS Lambda Developer Guide: Invoking Lambda function URLs - https://docs.aws.amazon.com/lambda/latest/dg/urls-invocation.html
- AWS Lambda Developer Guide: Response streaming for Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/configuration-response-streaming.html
- AWS Lambda Developer Guide: Writing response streaming-enabled Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/config-rs-write-functions.html
- AWS Lambda Developer Guide: Create an alias for a Lambda function - https://docs.aws.amazon.com/lambda/latest/dg/configuration-aliases.html
- Terraform Registry: aws_lambda_function_url resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function_url
- Terraform Registry: aws_lambda_permission resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- Terraform Registry: aws_lambda_function resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_function
- AWS announcement: CloudFront Origin Access Control for Lambda function URL origins - https://aws.amazon.com/about-aws/whats-new/2024/04/amazon-cloudfront-oac-lambda-function-url-origins/

## Issues Found
- The public `authorization_type = "NONE"` Terraform example created the function URL but did not add the Lambda resource-based permissions required for invocation. AWS documents that function URLs with `NONE` auth still need resource-based policy statements allowing `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction`. Added `aws_lambda_permission` resources for both actions, with `function_url_auth_type = "NONE"` and `invoked_via_function_url = true`.
- The IAM-authenticated example granted only `lambda:InvokeFunctionUrl`. Current AWS Lambda documentation says new function URLs require both `lambda:InvokeFunctionUrl` and `lambda:InvokeFunction` permissions. Added a second `aws_lambda_permission` resource for `lambda:InvokeFunction` scoped to function URL invocations.

## Review Notes
- The Lambda Function URL event shape, CORS fields, `invoke_mode = "RESPONSE_STREAM"`, Node.js `awslambda.streamifyResponse()`, and CloudFront fronting pattern are consistent with current AWS documentation.
- Response streaming availability is region-dependent and has VPC caveats; the post's streaming example is technically correct, but future revisions could mention those operational caveats.
- CloudFront Origin Access Control can now be used with Lambda function URL origins to restrict direct access to the function URL. The current CloudFront example is valid as a basic custom domain pattern, but future revisions could include OAC for stronger origin protection.
