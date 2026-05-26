# Validation Summary: How to Create AppSync GraphQL APIs in Terraform

## Status
validated

## Post Type
Tutorial / guide

## Technologies Covered
- Terraform
- AWS AppSync
- GraphQL
- Amazon Cognito User Pools
- AppSync API key authentication
- DynamoDB
- AWS Lambda
- IAM
- CloudWatch Logs
- AWS X-Ray

## Sources Consulted
- HashiCorp Terraform AWS Provider documentation for `aws_appsync_graphql_api`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appsync_graphql_api.html
- HashiCorp Terraform AWS Provider documentation for `aws_appsync_api_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appsync_api_key
- HashiCorp Terraform AWS Provider documentation for `aws_appsync_datasource`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appsync_datasource.html
- HashiCorp Terraform AWS Provider documentation for `aws_appsync_resolver`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appsync_resolver
- HashiCorp Terraform AWS Provider documentation for `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table.html
- AWS AppSync authorization documentation: https://docs.aws.amazon.com/appsync/latest/devguide/security-authz.html
- AWS AppSync DynamoDB resolver tutorial and mapping template references: https://docs.aws.amazon.com/appsync/latest/devguide/tutorial-dynamodb-resolvers.html
- AWS AppSync Lambda resolver mapping template reference: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-lambda.html

## Issues Found
- The post said the API key additional authentication provider was for public queries, but the schema did not mark any field or type with AppSync's `@aws_api_key` directive. With Cognito as the default authorization mode, additional authorization modes require schema directives for fields or types that should allow the additional mode. Updated the comment and schema example so `listPosts`, `Post`, and `PostConnection` are annotated for API key access.

## Review Notes
- The VTL examples use supported resolver mapping templates. AWS now emphasizes the APPSYNC_JS runtime in some newer documentation, but VTL remains supported and is valid for these Terraform resolver examples.
- The Lambda function example references an execution role (`aws_iam_role.lambda_exec`) and package file (`lambda/resolver.zip`) that would need to be defined elsewhere in a complete Terraform module.
