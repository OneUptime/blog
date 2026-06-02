# Validation Summary: How to Implement the Strangler Fig Pattern for AWS Migration

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS API Gateway REST APIs
- AWS Lambda proxy integrations
- Amazon DynamoDB and Boto3
- AWS Lambda resource-based permissions
- AWS AppConfig / feature flags
- AWS Migration Hub Refactor Spaces
- Python
- MySQL / PyMySQL

## Sources Consulted
- AWS CLI Command Reference: create-rest-api - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-rest-api.html
- AWS CLI Command Reference: put-integration - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration.html
- Amazon API Gateway Developer Guide: Set up a proxy integration with a proxy resource - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-set-up-simple-proxy.html
- Amazon API Gateway Developer Guide: Set up Lambda proxy integration using the AWS CLI - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integration-using-cli.html
- AWS Lambda Developer Guide: Invoking a Lambda function using an API Gateway endpoint - https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- AWS CLI Command Reference: lambda add-permission - https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html
- Boto3 DynamoDB get_item reference - https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/client/get_item.html
- Boto3 DynamoDB guide - https://docs.aws.amazon.com/boto3/latest/guide/dynamodb.html
- AWS Prescriptive Guidance: Strangler fig pattern - https://docs.aws.amazon.com/prescriptive-guidance/latest/cloud-design-patterns/strangler-fig.html
- AWS Migration Hub Refactor Spaces User Guide - https://docs.aws.amazon.com/migrationhub-refactor-spaces/latest/userguide/what-is-mhub-refactor-spaces.html

## Issues Found
- The API Gateway example created only a `/users` resource, but the Lambda example handled `/users/login` and `/users/profile`. Added a greedy `/users/{proxy+}` resource and pointed the Lambda proxy integration at that resource so those paths route to the new service.
- The Lambda proxy integration was missing the Lambda resource policy permission required for API Gateway to invoke the function. Added an `aws lambda add-permission` command with the API Gateway service principal and source ARN.
- The catch-all HTTP proxy resource was missing its `ANY` method and greedy path parameter mapping. Added `put-method` and `put-integration --request-parameters` entries so `{proxy+}` is forwarded to the legacy backend URI.
- The legacy HTTP proxy URI used an internal-looking hostname without VPC Link configuration. Changed it to a public example hostname so the REST API HTTP proxy snippet is valid as written.
- The Lambda authentication snippet used `get_item(Key={'email': email})` while the same table was also read by `user_id`. Because DynamoDB `get_item` requires the table primary key, changed the email lookup to query a configured secondary index.
- The feature flag snippet used `hashlib.md5()` without importing `hashlib`. Added the missing import.
- The post recommended AWS Migration Hub Refactor Spaces without noting the current availability limitation. Updated the text to say it applies if the reader already has access, and that AWS recommends AWS Transform for similar capabilities for new customers.

## Review Notes
- The Python snippets are illustrative and still depend on application-specific helpers such as `generate_session_token`, `validate_token`, `legacy_db_query`, `forward_to_new_service`, and `forward_to_legacy`.
- The local environment did not have the AWS CLI installed, so CLI command verification was performed against official AWS CLI and AWS service documentation rather than local `aws --help` output.
