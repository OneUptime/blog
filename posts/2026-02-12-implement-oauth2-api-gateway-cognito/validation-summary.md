# Validation Summary: How to Implement OAuth 2.0 with API Gateway and Cognito

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Cognito user pools
- Amazon Cognito app clients, user pool domains, resource servers, OAuth 2.0 scopes, and tokens
- Amazon API Gateway REST APIs with Cognito user pool authorizers
- Amazon API Gateway HTTP APIs with JWT authorizers
- AWS CLI
- AWS CloudFormation
- AWS Lambda
- Python with boto3 and requests

## Sources Consulted
- AWS CLI Command Reference: `cognito-idp create-user-pool-client` - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool-client.html
- AWS CLI Command Reference: `cognito-idp update-user-pool-client` - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/update-user-pool-client.html
- AWS CLI Command Reference: `cognito-idp create-user-pool-domain` - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool-domain.html
- Amazon Cognito Developer Guide: Understanding the access token - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- Amazon Cognito Developer Guide: Understanding the identity token - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-id-token.html
- Amazon Cognito Developer Guide: Scopes, M2M, and resource servers - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-define-resource-servers.html
- Amazon Cognito Developer Guide: Using your own domain for managed login - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-add-custom-domain.html
- Amazon API Gateway Developer Guide: Control access to REST APIs using Amazon Cognito user pools as an authorizer - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-integrate-with-cognito.html
- Amazon API Gateway Developer Guide: Call a REST API integrated with an Amazon Cognito user pool - https://docs.aws.amazon.com/apigateway/latest/developerguide/apigateway-invoke-api-integrated-with-cognito-user-pool.html
- Amazon API Gateway Developer Guide: Control access to HTTP APIs with JWT authorizers - https://docs.aws.amazon.com/apigateway/latest/developerguide/http-api-jwt-authorizer.html
- AWS CloudFormation Reference: `AWS::Cognito::UserPoolClient` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient.html
- AWS CloudFormation Reference: `AWS::ApiGateway::Method` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-apigateway-method.html
- AWS CloudFormation Reference: `AWS::Lambda::Permission` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-lambda-permission.html
- Referenced OneUptime article: https://oneuptime.com/blog/post/2026-01-26-restful-api-best-practices/view

## Issues Found
- The architecture section incorrectly implied that API Gateway calls Cognito on each request to validate the token. Updated the text and sequence diagram to describe JWT signature and claim validation against the Cognito issuer.
- The app-client CLI example generated a client secret, but the Python `initiate_auth` examples did not provide `SECRET_HASH`. Changed the app client to `--no-generate-secret` so the SDK examples work as written.
- The custom Cognito domain note said only that an ACM certificate was required. Updated it to state that Cognito custom-domain certificates must be in `us-east-1`.
- The `update-user-pool-client` command only supplied the new scopes. AWS documents that omitted app-client fields can be reset to defaults, so the example now carries forward the existing OAuth settings, callback/logout URLs, identity provider, explicit auth flows, and original OIDC scopes while adding the custom API scopes.
- The CloudFormation user pool client omitted `ExplicitAuthFlows`, which would prevent the later `USER_PASSWORD_AUTH` SDK example from working against that client. Added the matching auth flows and logout URL.
- The CloudFormation template referenced `MyFunction` without defining it and omitted the Lambda permission/API deployment resources needed for a usable REST API. Added a minimal Lambda function, execution role, invoke permission, and deployment.
- The REST API client example sent the access token while the Lambda example read identity claims such as `email`. Updated the example to call the REST API with the ID token, matching the Cognito authorizer identity-claims flow.
- The refresh-token Python snippet used `boto3` without importing it. Added the missing import.

## Review Notes
- Local checks: all Python snippets compiled with `python3`, all Bash snippets passed `bash -n`, the YAML snippet parsed with PyYAML using a loader for CloudFormation intrinsic tags, and `validation.json` parsed with `jq`.
- The AWS CLI is not installed in this workspace, so command syntax was verified against the current official AWS CLI reference rather than local `--help` output. `cfn-lint` is also not installed, so CloudFormation validation was performed by documentation review and static YAML parsing rather than full CloudFormation linting or live deployment.
