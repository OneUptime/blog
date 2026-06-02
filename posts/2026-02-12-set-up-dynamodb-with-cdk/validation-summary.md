# Validation Summary: How to Set Up DynamoDB with CDK

## Status
validated

## Post Type
Technical tutorial / setup guide

## Technologies Covered
- Amazon DynamoDB
- AWS CDK v2
- TypeScript
- AWS CloudFormation
- DynamoDB global secondary indexes and local secondary indexes
- DynamoDB provisioned and on-demand billing modes
- DynamoDB auto scaling
- DynamoDB Streams and TTL
- AWS KMS
- AWS Lambda
- AWS IAM grants
- DynamoDB global tables

## Sources Consulted
- AWS CDK DynamoDB Table API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.Table.html
- AWS CDK DynamoDB TableV2 API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.TableV2.html
- AWS CDK DynamoDB module README: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb-readme.html
- AWS CDK ContributorInsightsSpecification API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_dynamodb.ContributorInsightsSpecification.html
- AWS CDK PointInTimeRecoverySpecification API reference: https://docs.aws.amazon.com/cdk/api/v2/python/aws_cdk.aws_dynamodb/PointInTimeRecoverySpecification.html
- AWS CDK deploy command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html
- AWS CDK CLI reference: https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- Amazon DynamoDB secondary indexes documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/SecondaryIndexes.html
- Amazon DynamoDB local secondary indexes CLI documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/LCICli.html
- Amazon DynamoDB global secondary indexes documentation: https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/GSI.html
- AWS Lambda runtimes documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CDK Lambda Runtime API reference: https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/lambda/Runtime.html

## Issues Found
- The DynamoDB examples used the deprecated `pointInTimeRecovery` boolean property. Updated them to `pointInTimeRecoverySpecification: { pointInTimeRecoveryEnabled: true }`, which is the current CDK v2 API.
- The encryption example used the deprecated `contributorInsightsEnabled` boolean property. Updated it to `contributorInsightsSpecification: { enabled: true }`.
- The Lambda examples used `lambda.Runtime.NODEJS_20_X`. AWS Lambda's runtime table now lists Node.js 20 as past its deprecation date, and CDK documents newer Node.js runtimes. Updated both functions to `lambda.Runtime.NODEJS_22_X`.
- The LSI section said LSIs must be defined at table creation time, but the CDK example adds the LSI after instantiating the construct. Clarified that the LSI must be added before the table is deployed/created in DynamoDB, because DynamoDB does not allow adding LSIs to existing tables.

## Review Notes
Compiled representative versions of the updated CDK snippets against `aws-cdk-lib` 2.257.0 and TypeScript successfully. The OneUptime internal links are plausible same-site blog URLs, but their target posts were not part of this technical validation.
