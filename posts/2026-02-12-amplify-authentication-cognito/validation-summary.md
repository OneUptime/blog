# Validation Summary: How to Use Amplify Authentication with Cognito

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Amplify Auth
- Amazon Cognito
- Amplify CLI
- React
- JavaScript
- Amplify UI React Authenticator
- Multi-factor authentication with TOTP
- Social sign-in with Cognito Hosted UI

## Sources Consulted
- AWS Amplify JavaScript Auth sign-up documentation: https://docs.amplify.aws/javascript/frontend/auth/sign-up/
- AWS Amplify JavaScript Auth sign-in documentation: https://docs.amplify.aws/javascript/frontend/auth/sign-in/
- AWS Amplify JavaScript manage user sessions documentation: https://docs.amplify.aws/javascript/frontend/auth/manage-user-sessions/
- AWS Amplify JavaScript listen to auth events documentation: https://docs.amplify.aws/javascript/frontend/auth/listen-to-auth-events/
- AWS Amplify Gen 1 React manage MFA settings documentation: https://docs.amplify.aws/gen1/react/build-a-backend/auth/manage-mfa/
- AWS Amplify Gen 1 React social provider sign-in documentation: https://docs.amplify.aws/gen1/react/prev/build-a-backend/auth/add-social-provider/
- Amplify UI React installation documentation: https://ui.docs.amplify.aws/react/getting-started/installation
- Amplify UI React Authenticator configuration documentation: https://ui.docs.amplify.aws/react/connected-components/authenticator/configuration

## Issues Found
- The introduction implied Amplify Auth handles JWKS validation. Amplify Auth retrieves and refreshes Cognito tokens on the client, but JWKS validation is typically a separate server-side token verification concern, so the wording was changed to "retrieving tokens."
- The install command only installed `aws-amplify`, but the post later imports `@aws-amplify/ui-react`. Updated the command to install both packages.
- The sign-up confirmation example called `autoSignIn()` whenever `isSignUpComplete` was true. In Amplify v6, `autoSignIn()` should be called when `nextStep.signUpStep` is `COMPLETE_AUTO_SIGN_IN`, so the condition was corrected.
- The sign-in example omitted current documented next steps for email MFA, MFA selection, password reset, and unconfirmed sign-up. Added handling for those steps so the example does not incorrectly throw for valid Amplify responses.
- The social sign-in CLI prompt text said "Apply head-to-head changes," which is not the relevant Amplify CLI social-provider option. Updated it to the social provider federation configuration wording.
- The React auth context imported `Hub` from `aws-amplify/auth`. Current Amplify documentation imports `Hub` from `aws-amplify/utils`, so the import was corrected.

## Review Notes
The post uses Amplify Gen 1 CLI-style setup with current Amplify v6 functional Auth APIs. That combination is valid, but future updates could mention Amplify Gen 2's TypeScript backend setup and `amplify_outputs.json` for new projects.
