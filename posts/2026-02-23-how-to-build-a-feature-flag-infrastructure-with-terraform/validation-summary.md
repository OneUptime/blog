# Validation Summary: How to Build a Feature Flag Infrastructure with Terraform

## Status
validated

## Post Type
Tutorial / infrastructure guide

## Technologies Covered
- Terraform
- AWS AppConfig feature flags
- Amazon DynamoDB and DynamoDB Streams
- Amazon ElastiCache for Redis
- Amazon API Gateway HTTP APIs
- AWS Lambda
- Amazon EventBridge
- Amazon CloudWatch alarms
- Amazon SNS

## Sources Consulted
- AWS AppConfig feature flag type reference: https://docs.aws.amazon.com/appconfig/latest/userguide/appconfig-type-reference-feature-flags.html
- Terraform AWS provider `aws_appconfig_configuration_profile`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/appconfig_configuration_profile
- Terraform AWS provider `aws_apigatewayv2_integration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/apigatewayv2_integration
- Terraform AWS provider `aws_lambda_permission`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission
- AWS Lambda API Gateway permissions documentation: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- Terraform AWS provider `aws_dynamodb_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform AWS provider `aws_elasticache_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_replication_group
- Amazon EventBridge and CloudWatch Events compatibility documentation: https://docs.aws.amazon.com/eventbridge/latest/userguide/eb-cwe-now-eb.html

## Issues Found
- The API Gateway HTTP API Lambda integrations omitted `integration_method = "POST"`. Terraform's `aws_apigatewayv2_integration` documentation says this must be specified when the integration type is not `MOCK`, so both Lambda integrations were updated.
- The API Gateway routes did not grant API Gateway permission to invoke the Lambda functions. Added `aws_lambda_permission` resources for the evaluator and manager functions, matching AWS Lambda's resource-based permission requirement for API Gateway invocation.
- The EventBridge wording said updates were pushed to all services immediately, but the snippet only creates a bus and matching rule. Updated the wording to say events are published for subscribers to use when refreshing caches or local state.
- The latency guidance implied all evaluations should be sub-10ms and that Redis alone guarantees this. Updated the text to distinguish in-process Redis-backed reads from API Gateway/Lambda end-to-end evaluation latency.
- The ElastiCache replication group did not explicitly set the engine. Added `engine = "redis"` to make the Redis intent unambiguous and align with the provider resource configuration.

## Review Notes
The snippets still assume prerequisite resources such as IAM roles, security groups, CloudWatch log groups, API authorizers, Lambda ZIP artifacts, and subnet variables exist elsewhere in the Terraform module. That is acceptable for a blog excerpt, but a complete deployable example would need to include those supporting resources.
