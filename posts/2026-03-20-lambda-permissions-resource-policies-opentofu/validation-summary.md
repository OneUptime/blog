# Validation Summary: How to Set Up Lambda Permissions and Resource Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Lambda
- AWS IAM resource-based policies
- Amazon API Gateway
- Amazon S3 event notifications
- Amazon EventBridge
- AWS CLI

## Sources Consulted
- AWS Lambda AddPermission API Reference: https://docs.aws.amazon.com/lambda/latest/api/API_AddPermission.html
- Granting Lambda function access to AWS services: https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-services.html
- Granting Lambda function access to other accounts: https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-cross-account.html
- Granting function access to an organization: https://docs.aws.amazon.com/lambda/latest/dg/permissions-function-organization.html
- Viewing resource-based IAM policies in Lambda: https://docs.aws.amazon.com/lambda/latest/dg/access-control-resource-based.html
- Cross-account policy evaluation logic: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_evaluation-logic-cross-account.html
- AWS CLI `lambda get-policy`: https://docs.aws.amazon.com/cli/latest/reference/lambda/get-policy.html
- HashiCorp AWS provider `aws_lambda_permission` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/lambda_permission.html.markdown
- HashiCorp AWS provider `aws_lambda_function` data source docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/d/lambda_function.html.markdown
- HashiCorp AWS provider `aws_s3_bucket_notification` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/s3_bucket_notification.html.markdown
- HashiCorp AWS provider `aws_api_gateway_rest_api` docs: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/api_gateway_rest_api.html.markdown

## Issues Found
- The API Gateway example comment said the wildcard `source_arn` restricted access to a specific stage, but the shown ARN pattern does not do that. I corrected the comment so it accurately describes the scope and how to narrow it further.
- The Step 6 OpenTofu example used `data.aws_lambda_function.policy`, but the AWS provider's `aws_lambda_function` data source does not expose a `policy` attribute. I removed that incorrect snippet and clarified that the AWS CLI `lambda get-policy` command should be used to retrieve the resource-based policy.

## Review Notes
The snippets are technically accurate after correction, but they are illustrative fragments rather than a complete standalone OpenTofu module, so they assume the referenced Lambda, API Gateway, S3, and EventBridge resources already exist elsewhere in the configuration.
