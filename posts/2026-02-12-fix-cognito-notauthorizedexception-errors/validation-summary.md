# Validation Summary: How to Fix Cognito 'NotAuthorizedException' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon Cognito user pools
- AWS CLI
- AWS SDK for JavaScript v3
- Python
- Node.js
- AWS Lambda triggers
- Amazon CloudWatch Logs

## Sources Consulted
- Amazon Cognito Developer Guide: Authentication flows - https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-authentication-flow-methods.html
- Amazon Cognito Developer Guide: Signing up and confirming user accounts, including `SECRET_HASH` calculation - https://docs.aws.amazon.com/cognito/latest/developerguide/signing-up-users-in-your-app.html
- Amazon Cognito Developer Guide: Managing user existence error responses - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-managing-errors.html
- Amazon Cognito Developer Guide: Ending user sessions with token revocation - https://docs.aws.amazon.com/cognito/latest/developerguide/token-revocation.html
- Amazon Cognito API Reference: AdminSetUserPassword - https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminSetUserPassword.html
- Amazon Cognito Developer Guide: Pre authentication Lambda trigger - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-authentication.html
- AWS CLI Command Reference: `cognito-idp create-user-pool-client` - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool-client.html
- AWS CloudFormation Template Reference: `AWS::Cognito::UserPoolClient` - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-cognito-userpoolclient.html
- AWS SDK for JavaScript v3: Cognito Identity Provider client - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/

## Issues Found
- The post said app clients have a client secret by default when created through CloudFormation or the CLI. AWS documents `GenerateSecret` / `--generate-secret` as the setting that creates a client secret, so I changed the wording to say this applies when that setting is enabled.
- The token revocation section listed an admin password change as a cause of the `Access Token has been revoked` message. The official token revocation documentation lists `GlobalSignOut`, `AdminUserGlobalSignOut`, `RevokeToken`, and the revocation endpoint as revocation mechanisms, so I replaced the admin password-change bullet with `RevokeToken` / revocation endpoint.

## Review Notes
The AWS CLI is not installed in this workspace, so CLI syntax was checked against the official AWS CLI command reference instead of local `--help` output. The CloudWatch Logs example uses GNU `date -d`, which is fine for typical Linux shells but would need adjustment on macOS.
