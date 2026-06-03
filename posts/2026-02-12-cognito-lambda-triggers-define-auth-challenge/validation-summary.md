# Validation Summary: How to Use Cognito Lambda Triggers (Define Auth Challenge)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Cognito user pools
- Cognito custom authentication flows
- Cognito Define Auth Challenge Lambda trigger
- Cognito Create Auth Challenge Lambda trigger
- Cognito Verify Auth Challenge Response Lambda trigger
- AWS Lambda
- AWS SDK for JavaScript v3
- JavaScript / Node.js

## Sources Consulted
- Amazon Cognito Developer Guide: Custom authentication challenge Lambda triggers - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-challenge.html
- Amazon Cognito Developer Guide: Define Auth challenge Lambda trigger - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-define-auth-challenge.html
- Amazon Cognito API Reference: InitiateAuth - https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_InitiateAuth.html
- Amazon Cognito API Reference: RespondToAuthChallenge - https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_RespondToAuthChallenge.html
- AWS SDK for JavaScript v3 API Reference: InitiateAuthCommand - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/command/InitiateAuthCommand/
- OneUptime linked post: How to Implement Custom Authentication Flows in Cognito - https://oneuptime.com/blog/post/2026-02-12-custom-authentication-flows-cognito/view

## Issues Found
- The SRP plus custom challenge Define Auth Challenge example incorrectly started from an empty session by returning `SRP_A`. AWS documentation states that the client starts custom auth with SRP by calling `InitiateAuth` with `CHALLENGE_NAME: SRP_A`, `USERNAME`, and `SRP_A`; Cognito then invokes the Define trigger with an initial `SRP_A` session entry. I updated the example to handle `session.length === 1` with `SRP_A` and return `PASSWORD_VERIFIER`.
- The client-side passwordless custom auth example initiated `CUSTOM_AUTH` with only `USERNAME`. AWS documentation says passwordless custom challenge initiation can include `CHALLENGE_NAME: CUSTOM_CHALLENGE`, while SRP-backed custom auth should include `CHALLENGE_NAME: SRP_A` and the computed `SRP_A` value. I added `CHALLENGE_NAME: 'CUSTOM_CHALLENGE'` to the sample and added a short note distinguishing passwordless and SRP-backed starts.

## Review Notes
The remaining trigger event fields, session handling, retry logic, `CUSTOM_CHALLENGE` response shape with `ANSWER`, challenge metadata usage, and AWS SDK for JavaScript v3 command usage are consistent with AWS documentation. In a future expanded guide, the SRP client flow would need a real SRP implementation and handling for `NEW_PASSWORD_REQUIRED` and built-in MFA challenges when those are enabled.
