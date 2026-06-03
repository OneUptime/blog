# Validation Summary: How to Use CDK Triggers for Post-Deployment Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- CDK `triggers` module
- AWS Lambda
- AWS CloudFormation custom resources and dependencies
- Amazon RDS for PostgreSQL
- Amazon ElastiCache for Redis OSS / Valkey
- Amazon DynamoDB
- Python and TypeScript Lambda handlers

## Sources Consulted
- AWS CDK `aws-cdk-lib.triggers` module documentation: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.triggers-readme.html
- AWS CDK `Trigger` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.triggers.Trigger.html
- AWS CDK `TriggerFunction` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.triggers.TriggerFunction.html
- AWS CDK `Runtime` API reference: https://docs.aws.amazon.com/cdk/api/v2/java/software/amazon/awscdk/services/lambda/Runtime.html
- AWS Lambda runtime support documentation: https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS CDK `PostgresEngineVersion` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_rds.PostgresEngineVersion.html
- AWS CDK `CfnCacheCluster` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_elasticache.CfnCacheCluster.html
- AWS CDK trigger source implementation: https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk-lib/triggers/lib/trigger.ts
- AWS CDK `TriggerFunction` source implementation: https://github.com/aws/aws-cdk/blob/main/packages/aws-cdk-lib/triggers/lib/trigger-function.ts

## Issues Found
- The post said triggers do not create CloudFormation resources. CDK triggers are backed internally by a `Custom::Trigger` custom resource and provider, so I changed the explanation to say triggers avoid writing a custom resource yourself while still providing a purpose-built CDK API.
- The post said the trigger runs every time the stack is deployed. Official CDK docs state that, by default, triggers run on first deployment and re-run when the handler code or configuration changes. I updated the claim to match the default `executeOnHandlerChange` behavior.
- The TypeScript examples used `lambda.Runtime.NODEJS_20_X`. Node.js 20 reached its AWS Lambda deprecation date on April 30, 2026, so I updated the examples to `lambda.Runtime.NODEJS_22_X`.
- The RDS example used `rds.PostgresEngineVersion.VER_15_4`, which the current CDK API reference marks as deprecated because PostgreSQL 15.4 is no longer supported by Amazon RDS. I updated it to `rds.PostgresEngineVersion.VER_17_7`, matching the current CDK documentation example.

## Review Notes
The remaining snippets are illustrative and assume surrounding constructs such as `apiGateway`, `cacheCluster`, `handlerFunction`, and helper functions like `fetchPopularProducts()` are defined elsewhere. The ElastiCache endpoint attributes used for `cacheCluster` are valid for `elasticache.CfnCacheCluster`.
