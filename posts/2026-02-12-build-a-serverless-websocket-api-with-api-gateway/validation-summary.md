# Validation Summary: How to Build a Serverless WebSocket API with API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon API Gateway WebSocket APIs
- AWS Lambda
- Amazon DynamoDB
- AWS CLI
- Boto3 for Python
- IAM policies and Lambda resource-based permissions
- WebSocket testing with wscat

## Sources Consulted
- Amazon API Gateway: Create routes for WebSocket APIs: https://docs.aws.amazon.com/apigateway/latest/developerguide/websocket-api-develop-routes.html
- Amazon API Gateway: Set up a WebSocket API integration request: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-integration-requests.html
- AWS Lambda: Invoking a Lambda function using an Amazon API Gateway endpoint: https://docs.aws.amazon.com/lambda/latest/dg/services-apigateway.html
- AWS Lambda AddPermission API reference: https://docs.aws.amazon.com/lambda/latest/api/API_AddPermission.html
- Boto3 API Gateway Management API post_to_connection reference: https://docs.aws.amazon.com/boto3/latest/reference/services/apigatewaymanagementapi/client/post_to_connection.html
- Boto3 API Gateway Management API reference: https://docs.aws.amazon.com/boto3/latest/reference/services/apigatewaymanagementapi.html
- Boto3 DynamoDB Table.scan reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/scan.html
- Boto3 DynamoDB Table.query reference: https://docs.aws.amazon.com/boto3/latest/reference/services/dynamodb/table/query.html
- AWS CLI DynamoDB update-table command reference: https://docs.aws.amazon.com/cli/latest/reference/dynamodb/update-table.html
- Amazon API Gateway: Control access to WebSocket APIs with IAM authorization: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-control-access-iam.html
- Amazon API Gateway: Control access to WebSocket APIs with AWS Lambda REQUEST authorizers: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-websocket-api-lambda-auth.html

## Issues Found
- The HTTP introduction said the connection closes after each response. Updated it to say the connection can be reused or closed, which is accurate for modern HTTP persistent connections.
- The WebSocket Lambda integration examples used plain Lambda function ARNs. Updated them to the API Gateway Lambda invocation URI format and added `--integration-method POST`, matching the official WebSocket proxy integration CLI example.
- The setup omitted Lambda resource-based permissions allowing API Gateway to invoke the route handlers. Added `aws lambda add-permission` examples for `$connect`, `$disconnect`, and `sendMessage`.
- The IAM policy block was labeled as JSON but contained a JavaScript-style comment. Removed the comment so the snippet is valid JSON.
- The DynamoDB scan example only read the first scan page. Updated it to loop with `LastEvaluatedKey` so it actually collects all active connections.
- The IAM policy did not include `dynamodb:Query` or the table index ARN needed by the later GSI query example. Added both.
- The DynamoDB room query used a string key condition expression in a Boto3 resource example. Updated it to use `boto3.dynamodb.conditions.Key`, consistent with Boto3 resource usage.

## Review Notes
The tutorial is technically sound after the fixes. For production, the broadcast pattern should still account for API Gateway Management API throttling, Lambda timeout limits, DynamoDB pagination for queries as well as scans, and safer authentication token handling than query-string tokens where possible.
