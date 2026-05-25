# Validation Summary: How to Build a GraphQL API Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- AWS AppSync
- GraphQL
- DynamoDB
- AWS Lambda
- Amazon Cognito
- Amazon CloudWatch
- Amazon SNS
- AWS IAM

## Sources Consulted
- Terraform AWS provider documentation for `aws_appsync_graphql_api`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appsync_graphql_api
- Terraform AWS provider documentation for `aws_appsync_resolver`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appsync_resolver
- Terraform AWS provider documentation for `aws_appsync_datasource`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appsync_datasource
- Terraform AWS provider documentation for `aws_appsync_api_cache`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appsync_api_cache
- Terraform AWS provider documentation for `aws_appsync_api_key`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appsync_api_key
- AWS AppSync DynamoDB Scan resolver mapping template reference: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-resolver-mapping-template-reference-dynamodb-scan.html
- AWS AppSync Lambda resolver mapping template reference: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-mapping-template-reference-lambda.html
- AWS AppSync subscriptions documentation: https://docs.aws.amazon.com/appsync/latest/devguide/aws-appsync-real-time-data.html
- AWS AppSync caching documentation: https://docs.aws.amazon.com/appsync/latest/devguide/enabling-caching.html
- OneUptime blog URL referenced by the post: https://oneuptime.com/blog/post/2026-02-23-how-to-build-a-graphql-api-infrastructure-with-terraform/view

## Issues Found
- The schema used `@aws_subscribe(mutations: ["updateProduct"])` but did not define an `updateProduct` mutation. Added `updateProduct` and `UpdateProductInput` so the subscription references a real mutation field.
- The `listUsers` VTL request template could render invalid JSON because the `limit` field always ended with a comma even when `nextToken` was absent. Moved the comma inside the conditional and used `$util.toJson($ctx.args.nextToken)`.
- The Lambda example referenced `aws_dynamodb_table.orders`, `aws_iam_role.order_lambda`, and `aws_iam_role.appsync_lambda` without defining them. Added the orders table and the IAM roles/policies required for Lambda execution and AppSync Lambda invocation.
- The AppSync API example referenced `aws_cognito_user_pool.main` and `aws_iam_role.appsync_logs` without defining them. Added minimal Cognito user pool and CloudWatch Logs role resources.
- The monitoring example referenced `aws_sns_topic.api_alerts` without defining it. Added the SNS topic resource.
- The cache resource used `PER_RESOLVER_CACHING`, but no resolver opted into caching. Added a `caching_config` block to the `getUser` resolver.

## Review Notes
The VTL resolver examples remain valid, but AWS documentation now primarily points new AppSync resolver development toward the APPSYNC_JS runtime. The post can still use VTL because Terraform and AppSync continue to support these mapping templates.
