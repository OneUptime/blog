# Validation Summary: How to Use Amplify API (REST) with API Gateway

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Amplify Gen 1 CLI and JavaScript REST API client
- Amazon API Gateway REST APIs and Lambda proxy integration
- AWS Lambda with Node.js
- Amazon DynamoDB and AWS SDK for JavaScript v3
- Amazon Cognito and IAM-based API authorization
- React

## Sources Consulted
- AWS Amplify Gen 1 documentation: Configure REST API - https://docs.amplify.aws/gen1/javascript/build-a-backend/restapi/configure-rest-api/
- AWS Amplify Gen 1 documentation: Fetch data for REST APIs - https://docs.amplify.aws/gen1/javascript/build-a-backend/restapi/fetch-data/
- AWS Amplify Gen 1 documentation: Update data for REST APIs - https://docs.amplify.aws/gen1/javascript/build-a-backend/restapi/update-data/
- AWS Amplify Gen 1 documentation: Define REST API authorization rules - https://docs.amplify.aws/gen1/javascript/prev/build-a-backend/restapi/customize-authz/
- Amazon API Gateway documentation: Lambda proxy integrations - https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
- Amazon API Gateway documentation: Cognito user pool authorizers for REST APIs - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html

## Issues Found
- The post said the Amplify REST client automatically attaches a Cognito token to requests. Amplify-generated Gen 1 REST APIs with restricted access use IAM authorization with Cognito-backed credentials, so the client signs requests rather than simply attaching a JWT. I corrected the introduction, client section, and wrap-up to describe authenticated request signing, and noted that JWT headers apply when a Cognito user pool authorizer is configured.
- The Lambda handler assumed `requestContext.authorizer.claims.sub` would be present. API Gateway only provides those claims for `COGNITO_USER_POOLS` authorizers; Amplify CLI's default restricted REST API flow uses AWS_IAM. I changed the handler and middleware example to use `requestContext.identity.cognitoIdentityId` first, with Cognito authorizer claims as an optional fallback.
- The list operation queried a `userId-createdAt-index` DynamoDB GSI that the post never created or configured. I replaced that example with a `ScanCommand` filtered by `userId`, then sorted and limited in code so the snippet works with the simple generated table shape. This is less efficient than a purpose-built GSI, but avoids referencing undeclared infrastructure.

## Review Notes
Amplify Gen 1 documentation is in maintenance mode and reaches end of life on May 1, 2027. The post remains technically useful for existing Gen 1 projects, but new projects should consider Amplify Gen 2. For production-scale item listing, a DynamoDB GSI on `userId` and `createdAt` would be preferable to a filtered scan.
