# Validation Summary: Set Up AppSync GraphQL APIs with Lambda Resolvers

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS AppSync
- GraphQL
- AWS Lambda
- AWS SAM
- AWS CloudFormation
- Amazon DynamoDB
- AWS SDK for JavaScript v3
- AWS CLI
- CloudWatch

## Sources Consulted
- AWS AppSync direct Lambda resolver documentation: https://docs.aws.amazon.com/appsync/latest/devguide/direct-lambda-reference.html
- AWS AppSync JavaScript Lambda resolver reference: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-reference-lambda-js.html
- AWS AppSync JavaScript resolver context reference: https://docs.aws.amazon.com/appsync/latest/devguide/resolver-context-reference-js.html
- AWS CloudFormation AWS::AppSync::GraphQLApi reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-appsync-graphqlapi.html
- AWS CloudFormation AWS::AppSync::GraphQLSchema reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-appsync-graphqlschema.html
- AWS CloudFormation AWS::AppSync::DataSource reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-appsync-datasource.html
- AWS CloudFormation AWS::AppSync::Resolver reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-appsync-resolver.html
- AWS CloudFormation AWS::AppSync::ApiKey reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-appsync-apikey.html
- AWS SAM AWS::Serverless::Function reference: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-function.html
- AWS SAM policy template list: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-policy-template-list.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS SDK for JavaScript v3 DynamoDB examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/dynamodb-example-dynamodb-utilities.html
- AWS AppSync CloudWatch monitoring documentation: https://docs.aws.amazon.com/appsync/latest/devguide/monitoring.html

## Issues Found
- The GraphQL schema defined `reviews`, `Review`, `searchProducts`, `addReview`, and `AddReviewInput`, but the Lambda resolver and SAM resources did not implement or attach resolvers for those fields. Removed those unimplemented schema fields so the schema matches the resolver implementation.
- The SAM template only created resolvers for `getProduct`, `listProducts`, and `createProduct`, while the Lambda also implemented `updateProduct` and `deleteProduct`. Added `UpdateProductResolver` and `DeleteProductResolver`.
- The SAM resolver resources did not depend on `ProductSchema`, so CloudFormation could attempt to create resolvers before the schema fields existed. Added `DependsOn: ProductSchema` to each resolver.
- The SAM schema used `DefinitionS3Location: schema.graphql`, but CloudFormation expects an S3 location when using `DefinitionS3Location`. Changed it to an S3 URI placeholder.
- The API key expiration timestamp was in the past as of the validation date. Updated it to a future epoch timestamp.
- The Lambda function used the `nodejs20.x` runtime, which AWS documentation lists as deprecated before the validation date. Updated it to `nodejs22.x`.
- The SAM function omitted `CodeUri`, which is required for ZIP package functions unless `InlineCode` is used. Added `CodeUri: .`.
- The Lambda function accessed DynamoDB but the SAM template did not grant DynamoDB permissions. Added the SAM `DynamoDBCrudPolicy` for the products table.
- The create-product curl example omitted `description`, but the GraphQL input marks `description` as required. Added a description value to the mutation.
- The Lambda handler handled direct Lambda resolver events and a custom top-level payload, but the APPSYNC_JS Lambda resolver example sends the custom data under `event.payload`. Added normalization so the handler works with both direct Lambda resolvers and the JavaScript resolver example.

## Review Notes
- The Lambda code uses AWS SDK for JavaScript v3 DynamoDB document client commands that match current AWS examples. In a real project, the deployment package should include the required AWS SDK modules rather than relying on the runtime-provided SDK version.
- The CLI resolver example shows one field resolver. The surrounding text correctly says to create resolvers for each field.
