# Validation Summary: How to Use Cognito Groups for Role-Based Access Control

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Cognito user pools
- Cognito user pool groups
- AWS CLI
- JWT
- Express.js
- API Gateway Lambda authorizers
- JavaScript

## Sources Consulted
- Amazon Cognito Developer Guide: Adding groups to a user pool - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html
- AWS CLI Command Reference: cognito-idp create-group - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-group.html
- Amazon Cognito Developer Guide: Quotas in Amazon Cognito - https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html
- Amazon Cognito Developer Guide: Verifying JSON web tokens - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
- API Gateway Developer Guide: Control access to HTTP APIs with AWS Lambda authorizers - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-lambda-authorizer.html
- jsonwebtoken package documentation - https://www.npmjs.com/package/jsonwebtoken

## Issues Found
- The Express middleware verified the JWT signature but did not validate Cognito-specific token properties like issuer, app client audience, allowed algorithm, or token type. Updated the sample to define the Cognito issuer and app client ID, restrict verification to RS256, validate the issuer and audience, and reject non-ID tokens.
- The frontend JWT decoding example passed the JWT payload directly to `atob`, but JWT header and payload segments are base64url encoded. Updated the sample to convert base64url to base64 and add padding before decoding.
- The backend middleware did not state which token type the sample expected. Added a short clarification that the Express example expects an ID token, matching the `aud` and `token_use` validation in the corrected code.

## Review Notes
The main Cognito claims, group precedence behavior, group-management CLI commands, and group quotas were accurate against current AWS documentation. For production systems, AWS recommends validating Cognito JWTs with the `aws-jwt-verify` library; the corrected `jsonwebtoken` example is still technically valid but requires careful maintenance of issuer, audience, algorithm, and token type checks.
