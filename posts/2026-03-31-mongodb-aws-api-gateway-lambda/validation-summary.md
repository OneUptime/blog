# Validation Summary: How to Use MongoDB with AWS API Gateway and Lambda

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas
- MongoDB Node.js Driver
- AWS Lambda
- AWS API Gateway (HTTP API v2)
- AWS SAM (Serverless Application Model)
- AWS Lambda Layers
- MongoDB Atlas CLI

## Sources Consulted
- AWS SAM resource types documentation: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-httpapi.html
- AWS SAM `AWS::Serverless::HttpApi` vs `AWS::Serverless::Api`: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-resource-api.html
- MongoDB Node.js Driver connection options documentation: https://www.mongodb.com/docs/drivers/node/current/fundamentals/connection/connection-options/
- MongoDB Atlas CLI `accessLists create` reference: https://www.mongodb.com/docs/atlas/cli/current/command/atlas-accessLists-create/
- MongoDB Atlas Data API deprecation notice: https://www.mongodb.com/docs/atlas/app-services/data-api/
- AWS Lambda Layer packaging guide: https://docs.aws.amazon.com/lambda/latest/dg/chapter-layers.html

## Issues Found

1. **Incorrect SAM resource type for HTTP API**: The post recommended using API Gateway v2 HTTP API but the SAM template used `AWS::Serverless::Api`, which creates a REST API (v1). Changed to `AWS::Serverless::HttpApi` which correctly creates an HTTP API. Also restructured the template to use proper SAM format with resources declared separately under a `Resources` block, rather than nesting the function inside the API resource.

2. **Atlas CLI `accessLists create` incorrect flag**: The command used `--ip "$NAT_IP/32"` but the Atlas CLI expects the IP/CIDR as a positional argument, not via an `--ip` flag. Changed to `atlas accessLists create "$NAT_IP/32" --projectId <PROJECT_ID> --comment "Lambda NAT gateway"`.

3. **Deprecated `socketTimeoutMS` option**: The connection exhaustion code example included `socketTimeoutMS: 45000`. This option was removed in MongoDB Node.js Driver v6+. Removed it from the example since the driver now handles socket timeouts internally.

4. **Outdated MongoDB Data API recommendation**: The post recommended the MongoDB Data API as a connection-pooling proxy. The Data API was deprecated in September 2024. Removed the reference, keeping only Atlas App Services as the recommended alternative.

## Review Notes
- The Lambda Layer packaging commands are correct for the `nodejs` directory convention that Lambda expects.
- The connection caching pattern (storing the client outside the handler) is the officially recommended approach for MongoDB with Lambda.
- The `maxPoolSize: 1` recommendation is correct and aligns with MongoDB's Lambda best practices.
- The `{{resolve:secretsmanager:...}}` dynamic reference syntax in the SAM template is correct for resolving secrets at deploy time.
- The `ObjectId` usage in the handler is correct for MongoDB Node.js Driver v6+ (it is imported from the `mongodb` package directly).
