# Validation Summary: How to Troubleshoot Cognito Sign-In Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Amazon Cognito user pools
- AWS SDK for JavaScript v3
- AWS CLI
- Amazon CloudWatch Logs
- AWS Lambda triggers
- JSON Web Tokens

## Sources Consulted
- Amazon Cognito InitiateAuth API Reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html
- Amazon Cognito Lambda triggers developer guide: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-identity-pools-working-with-aws-lambda-triggers.html
- Amazon Cognito quotas developer guide: https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html
- Amazon Cognito user existence error responses: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-managing-errors.html
- Amazon Cognito verifying JSON web tokens: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-tokens-verifying-a-jwt.html
- Amazon Cognito access token documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/amazon-cognito-user-pools-using-the-access-token.html
- Amazon Cognito app client settings / AWS CLI describe-user-pool-client reference: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/describe-user-pool-client.html
- AWS CLI CloudWatch Logs filter-log-events reference: https://docs.aws.amazon.com/cli/latest/reference/logs/filter-log-events.html

## Issues Found
- The rate-limit section incorrectly described most user pool operations as 120 RPS and listed Hosted UI as 1000 RPS. Updated it to reflect Cognito's category-based quotas: `UserAuthentication` is 120 RPS, `RespondToAuthChallenge` has special handling, `UserRead` is 120 RPS, and `UserResourceRead` is 50 RPS.
- The token signature troubleshooting note over-attributed invalid signatures to stale JWKS keys. Updated it to include wrong user pool, region, issuer, or token type as common causes, with stale JWKS cache called out for a correct issuer and unfamiliar `kid`.
- The configuration checklist used request `AuthFlow` names where app-client configuration uses `ExplicitAuthFlows` values. Updated the checklist to use `ALLOW_USER_PASSWORD_AUTH`, `ALLOW_USER_SRP_AUTH`, and `ALLOW_USER_AUTH`.
- The password policy note implied existing weaker passwords could block ordinary login after a policy change. Updated it to apply to password reset, password change, and `NEW_PASSWORD_REQUIRED` flows.

## Review Notes
The JavaScript examples are syntactically valid snippets for the AWS SDK for JavaScript v3 style, assuming the surrounding imports, client initialization, constants, and optional `SECRET_HASH` handling are supplied by the application. The AWS CLI examples use valid flags, but the local environment did not have the AWS CLI installed, so command verification was performed against official AWS CLI documentation instead of local `--help` output.
