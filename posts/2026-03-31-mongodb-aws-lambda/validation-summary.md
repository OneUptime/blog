# Validation Summary: How to Use MongoDB with AWS Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB
- MongoDB Atlas
- Mongoose (Node.js ODM)
- AWS Lambda
- AWS API Gateway
- Serverless Framework
- AWS CLI (EC2 describe-nat-gateways)

## Sources Consulted
- Mongoose official documentation (v8.x/9.x) for `connect()` options, `readyState`, `bufferCommands`, `lean()`, and `Model.create()` — https://mongoosejs.com/docs/
- MongoDB Node.js Driver documentation for connection pool options (`maxPoolSize`, `minPoolSize`, `serverSelectionTimeoutMS`, `socketTimeoutMS`) — https://www.mongodb.com/docs/drivers/node/current/
- AWS Lambda runtimes documentation — https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS API Gateway HTTP API v2 payload format documentation — https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-develop-integrations-lambda.html
- AWS API Gateway REST API v1 event format documentation — https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- Serverless Framework `httpApi` vs `http` event documentation — https://www.serverless.com/framework/docs/providers/aws/events/http-api
- AWS CLI `describe-nat-gateways` reference — https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-nat-gateways.html

## Issues Found
- **Serverless config / handler event format mismatch**: The Serverless Framework configuration used `httpApi` events (API Gateway HTTP API v2), but the Lambda handler code accessed `event.httpMethod`, which is a property only available in API Gateway REST API v1 payload format. With HTTP API v2 (payload format 2.0), the HTTP method is at `event.requestContext.http.method`, not `event.httpMethod`. The handler would have received `undefined` for `event.httpMethod` at runtime, causing all requests to fall through to the 405 response. **Fix**: Changed `httpApi` to `http` in the Serverless Framework configuration so it creates a REST API endpoint whose event format includes `event.httpMethod`, matching the handler code.

## Review Notes
- The AWS CLI command `aws ec2 describe-nat-gateways --query 'NatGateways[*].NatGatewayAddresses[*].PublicIp'` is valid but returns a nested array. Using `[]` instead of `[*]` (i.e., `NatGateways[].NatGatewayAddresses[].PublicIp`) would return a flat list of IPs, which is slightly more useful. This is a minor style preference, not an error.
- All Mongoose options (`serverSelectionTimeoutMS`, `maxPoolSize`, `minPoolSize`, `socketTimeoutMS`) are current and non-deprecated as of Mongoose 8.x/9.x.
- The connection caching pattern with module-scope variables is the officially recommended approach for MongoDB in AWS Lambda.
- `nodejs20.x` is a valid and supported AWS Lambda runtime.
