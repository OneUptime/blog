# Validation Summary: How to Use Cognito Authorizers with API Gateway

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon API Gateway HTTP APIs
- Amazon Cognito User Pools
- API Gateway Cognito user pool authorizers
- API Gateway JWT authorizers
- AWS SAM
- AWS CLI
- AWS Lambda Node.js handlers
- OAuth 2.0 scopes and JWT claims

## Sources Consulted
- AWS API Gateway Developer Guide: Control access to HTTP APIs with JWT authorizers in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS API Gateway Developer Guide: Integrate a REST API with an Amazon Cognito user pool: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-enable-cognito-user-pool.html
- Amazon Cognito Developer Guide: Understanding the access token: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- AWS SAM Developer Guide: CognitoAuthorizer: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-property-api-cognitoauthorizer.html
- AWS SAM Developer Guide: Control API access with your AWS SAM template: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/serverless-controlling-access-to-apis.html
- AWS CLI Command Reference: apigateway create-authorizer: https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-authorizer.html
- AWS CLI Command Reference: apigatewayv2 create-authorizer and update-route examples in API Gateway HTTP API docs: https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS CLI Command Reference: cognito-idp admin-initiate-auth: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/admin-initiate-auth.html
- AWS API Gateway API Reference: Authorizer authorizerResultTtlInSeconds: https://docs.aws.amazon.com/apigateway/latest/api/API_Authorizer.html
- AWS API Gateway Developer Guide: Lambda proxy integrations in API Gateway: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html

## Issues Found
- The initial REST API SAM example configured `AuthorizationScopes` while the later test used an ID token. AWS documents that REST API Cognito authorizers treat methods without scopes as ID-token authorization, and methods with scopes as access-token authorization. Removed the scopes from the basic REST SAM example so it matches the ID-token testing flow.
- The token guidance said REST API Cognito authorizers accept either token without qualification. Updated it to explain that unscoped REST methods use ID tokens, while scoped REST methods require access tokens.
- The access-token claim description said access tokens have `client_id` and not `aud`. Current Cognito documentation says access tokens have `client_id` and can include `aud` when resource binding is used. Updated the wording.
- The HTTP API JWT authorizer guidance said the configured audience is validated without mentioning Cognito access tokens that use `client_id` when `aud` is absent. Updated the explanation and troubleshooting note to match API Gateway JWT authorizer validation behavior.

## Review Notes
- The AWS CLI is not installed in this workspace, so command syntax was checked against official AWS CLI documentation instead of local `--help` output.
- REST API claim formatting for `cognito:groups` as a comma-separated string is consistent with observed API Gateway Cognito authorizer behavior, though AWS documents the original Cognito token claim itself as an array.
