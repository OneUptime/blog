# Validation Summary: How to Migrate AWS Cognito User Pools to Google Cloud Identity Platform

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- AWS Cognito User Pools
- Google Cloud Identity Platform
- Firebase Authentication and Firebase Admin SDK
- Google Cloud CLI and Identity Platform REST API
- AWS CLI and boto3
- Python Cloud Functions / Firebase Functions
- JavaScript Firebase Auth SDK

## Sources Consulted
- AWS CLI `cognito-idp list-users` command reference: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/list-users.html
- Amazon Cognito user import documentation: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-using-import-tool.html
- Boto3 Cognito `initiate_auth` reference: https://docs.aws.amazon.com/boto3/latest/reference/services/cognito-idp/client/initiate_auth.html
- Identity Platform email sign-in guide: https://cloud.google.com/identity-platform/docs/sign-in-user-email
- Identity Platform `projects.identityPlatform.initializeAuth` REST reference: https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects.identityPlatform/initializeAuth
- Identity Platform `projects.updateConfig` REST reference: https://cloud.google.com/identity-platform/docs/reference/rest/v2/projects/updateConfig
- Identity Platform `Config` REST resource reference: https://cloud.google.com/identity-platform/docs/reference/rest/v2/Config
- Identity Platform blocking functions guide: https://cloud.google.com/identity-platform/docs/blocking-functions
- Firebase Admin Python `auth` reference: https://firebase.google.com/docs/reference/admin/python/firebase_admin.auth
- Firebase Functions Python `identity_fn` reference: https://firebase.google.com/docs/reference/functions/2nd-gen/python/firebase_functions.identity_fn
- Firebase JavaScript Auth reference: https://firebase.google.com/docs/reference/js/auth
- Identity Platform TOTP MFA guide: https://cloud.google.com/identity-platform/docs/admin/enabling-totp-mfa

## Issues Found
- The AWS CLI `list-users` example used `--limit`, which is a service API parameter but not an AWS CLI paginator option for this command. Changed it to `--page-size 60`.
- The Identity Platform setup block used non-existent `gcloud identity-platform config update` commands. Replaced them with the documented Identity Platform initialization and configuration REST calls, using `gcloud auth print-access-token` for authorization.
- The post said additional identity providers could be configured with the Admin SDK. Updated this to Cloud Console or Identity Platform REST API, since default supported providers are configured outside the Firebase Admin SDK.
- The Firebase client fallback only checked `auth/wrong-password`. Updated it to also handle `auth/invalid-credential`, which is a current Firebase Auth error code for invalid login credentials.
- The Cognito trigger mapping overstated custom message and pre-token-generation equivalents. Updated the rows to refer to email templates/custom SMTP/SMS templates and `beforeSignIn` session claims.
- The Python blocking-function example returned the event object on allow. Updated it to match the Python Functions API shape by returning `None` and added the documented event/response type annotations.

## Review Notes
The lazy password migration example is intentionally simplified. Production implementations should also handle Cognito app clients with a client secret by adding `SECRET_HASH`, and should handle Cognito challenges such as MFA or `NEW_PASSWORD_REQUIRED` if those users exist in the source pool.
