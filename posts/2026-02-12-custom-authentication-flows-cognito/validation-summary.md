# Validation Summary: How to Implement Custom Authentication Flows in Cognito

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Cognito user pools
- Cognito custom authentication Lambda triggers
- AWS Lambda
- Amazon SES
- AWS SDK for JavaScript v3
- AWS CLI
- Node.js

## Sources Consulted
- Amazon Cognito Developer Guide: Custom authentication challenge Lambda triggers: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-challenge.html
- Amazon Cognito Developer Guide: Define Auth challenge Lambda trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-define-auth-challenge.html
- Amazon Cognito Developer Guide: Create Auth challenge Lambda trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-create-auth-challenge.html
- Amazon Cognito Developer Guide: Verify Auth challenge response Lambda trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-verify-auth-challenge-response.html
- Amazon Cognito Developer Guide: Authentication with Amazon Cognito user pools: https://docs.aws.amazon.com/cognito/latest/developerguide/authentication.html
- Amazon Cognito User Pools API Reference: UpdateUserPoolClient/AuthSessionValidity: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UpdateUserPoolClient.html
- AWS CLI Command Reference: cognito-idp update-user-pool: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/update-user-pool.html
- AWS CLI Command Reference: lambda add-permission: https://docs.aws.amazon.com/cli/latest/reference/lambda/add-permission.html

## Issues Found
- The OTP generation used `crypto.randomInt(100000, 999999)`, where the upper bound is exclusive. Changed it to `crypto.randomInt(100000, 1000000)` so all six-digit values from 100000 through 999999 are possible.
- The sample email said the OTP expires in 5 minutes, but the code didn't implement a 5-minute expiry and Cognito's default authentication challenge session is 3 minutes. Changed the message to say it expires when the authentication session expires.
- The passwordless client example initiated `CUSTOM_AUTH` without `CHALLENGE_NAME: 'CUSTOM_CHALLENGE'`. Added it to match AWS's documented custom authentication initiation pattern.
- The SRP-plus-custom-challenge Define trigger tried to issue `SRP_A` from an empty session. AWS documents that SRP custom auth starts with the client sending `CHALLENGE_NAME: 'SRP_A'` and `SRP_A`, and the first Define trigger invocation receives `SRP_A` in the session. Updated the explanation and code accordingly.
- The `aws cognito-idp update-user-pool --lambda-config` example split shorthand fields into separate shell arguments. Changed it to the comma-separated shorthand format shown in AWS CLI documentation.
- The session-duration note said the setting was in the user pool settings. Changed it to app client settings, where Cognito's Authentication flow session duration/AuthSessionValidity is configured.
- Added a deployment note that `update-user-pool` should include existing user pool options that must be preserved, because unspecified options can reset to defaults.

## Review Notes
The tutorial assumes an app client without a client secret. If a client secret is enabled, Cognito API calls also require `SECRET_HASH`. The OneUptime Terraform and CDK links referenced by the post returned HTTP 200 during review.
