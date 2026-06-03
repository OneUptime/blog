# Validation Summary: How to Integrate Cognito with API Gateway for Authorization

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon API Gateway REST APIs
- Amazon Cognito user pools
- Cognito resource servers and OAuth scopes
- AWS CLI
- Lambda authorizers
- JavaScript / Node.js
- AWS Amplify Auth
- CORS

## Sources Consulted
- Amazon API Gateway Developer Guide: Control access to REST APIs using Amazon Cognito user pools as an authorizer: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html
- Amazon API Gateway Developer Guide: Integrate a REST API with an Amazon Cognito user pool: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-enable-cognito-user-pool.html
- AWS CLI Command Reference: apigateway create-authorizer: https://docs.aws.amazon.com/cli/latest/reference/apigateway/create-authorizer.html
- AWS CLI Command Reference: apigateway update-method: https://docs.aws.amazon.com/cli/latest/reference/apigateway/update-method.html
- AWS CLI Command Reference: apigateway put-integration: https://docs.aws.amazon.com/cli/latest/reference/apigateway/put-integration.html
- AWS CLI Command Reference: cognito-idp create-resource-server: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-resource-server.html
- AWS CLI Command Reference: cognito-idp update-user-pool-client: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/update-user-pool-client.html
- Amazon Cognito Developer Guide: Scopes, M2M, and resource servers: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
- Amazon Cognito Developer Guide: Understanding the access token: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- Amazon API Gateway Developer Guide: Use API Gateway Lambda authorizers: https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-use-lambda-authorizer.html
- AWS Amplify Gen 1 documentation: Migrate from v5 to v6: https://docs.amplify.aws/react/build-a-backend/auth/auth-migration-guide/

## Issues Found
- The post described IAM authorization as a type of authorizer. Changed the wording to "authorization options" because API Gateway method authorization supports IAM, while Cognito user pool and Lambda authorizers are authorizer resources.
- The token validation explanation said `token_use` could be either `id` or `access` without qualification. Updated it to explain the REST API Cognito authorizer behavior: methods without authorization scopes use ID tokens, while methods with authorization scopes use access tokens.
- The sequence diagram implied API Gateway calls Cognito on every request to validate the token. Updated the diagram to show API Gateway validating JWT signature and claims itself.
- The Cognito app client update command configured scopes but did not enable OAuth authorization server features or specify an OAuth flow. Added `--allowed-o-auth-flows-user-pool-client` and an example `--allowed-o-auth-flows "code"`.
- The Lambda authorizer example said it checked Cognito groups but always returned `Allow`. Updated the example to deny `/admin/` method ARNs unless the token has the `admin` Cognito group, and added checks for token header shape, token use, and app client ID.
- The client example said it fetched an access token but used an ID token, and it used the older Amplify `Auth.currentSession()` API. Updated it to use `fetchAuthSession()` and clarified when to use ID tokens versus access tokens.
- The client example sent `Bearer <token>` to the built-in REST API Cognito authorizer. Updated the built-in authorizer example to send the JWT value in the configured token header.
- The CORS section created an OPTIONS method and mock integration but did not configure method and integration responses to emit CORS headers. Added `put-method-response` and `put-integration-response` commands with `Access-Control-Allow-*` headers.

## Review Notes
The post is now technically sound for API Gateway REST APIs. For future improvements, the article could mention HTTP API JWT authorizers separately because their configuration model differs from REST API Cognito user pool authorizers.
