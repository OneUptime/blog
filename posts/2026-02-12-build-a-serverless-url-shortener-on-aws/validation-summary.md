# Validation Summary: How to Build a Serverless URL Shortener on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Lambda
- Amazon API Gateway REST APIs
- Amazon DynamoDB
- DynamoDB TTL
- DynamoDB Accelerator (DAX)
- Amazon SQS
- AWS CLI
- Python
- Boto3

## Sources Consulted
- AWS CLI Command Reference: `apigateway put-method` - https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-method.html
- Amazon API Gateway Developer Guide: Set up a method request - https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-method-settings-method-request.html
- AWS CLI Command Reference: `apigateway put-integration` - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/apigateway/put-integration.html
- AWS CLI Command Reference: `apigateway create-deployment` - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-deployment.html
- AWS CLI Command Reference: `apigateway create-domain-name` - https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-domain-name.html
- Amazon DynamoDB Developer Guide: Update expressions - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/Expressions.UpdateExpressions.html
- Amazon DynamoDB Developer Guide: Time to Live (TTL) - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/TTL.html
- Amazon DynamoDB Developer Guide: Python and DAX examples - https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/DAX.client.run-application-python.03-getitem-test.html
- AWS Lambda Developer Guide: Lambda SnapStart - https://docs.aws.amazon.com/lambda/latest/dg/snapstart.html
- Python documentation: `datetime` - https://docs.python.org/3/library/datetime.html

## Issues Found
- The redirect Lambda described click recording as asynchronous "fire and forget", but the code called DynamoDB synchronously before returning the redirect. I changed the comment to accurately describe synchronous recording with failure isolation.
- The redirect Lambda used `datetime.utcnow()`, which is deprecated in Python 3.12. I replaced it with `datetime.now(timezone.utc)` and removed an unused `time` import.
- The redirect Lambda assumed `event["headers"]` was always a dictionary. I changed the snippet to tolerate missing or null headers before reading `Referer`.
- The API Gateway setup created methods but did not add Lambda proxy integrations, Lambda invoke permissions, an analytics route, or a deployment stage. I added the missing `put-integration`, `lambda add-permission`, `/analytics/{code}`, and `create-deployment` commands so the REST API can invoke the Lambda handlers.
- The regional custom domain example used a hard-coded `us-east-1` ACM certificate ARN while configuring a `REGIONAL` API Gateway domain. I changed the placeholder ARN to use the configured API region.
- The DAX Python snippet used an incorrect client construction pattern for the documented Python DAX client. I changed it to `amazondax.AmazonDaxClient.resource(...)` and a table resource `get_item` call.
- The asynchronous SQS click-tracking snippet referenced `os`, `json`, and `datetime` without importing them, used deprecated `datetime.utcnow()`, and assumed headers were always present. I added the missing imports, used timezone-aware UTC timestamps, and guarded header access.

## Review Notes
The AWS CLI is not installed in this workspace, so CLI examples were checked against official AWS CLI and service documentation rather than local `aws --help` output. The API Gateway commands assume the Lambda functions have already been created with the placeholder names shown in the post.
