# Validation Summary: How to Enable MFA in Cognito User Pools

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito User Pools
- Cognito MFA with TOTP and SMS
- AWS CLI
- Terraform AWS provider
- AWS Amplify JavaScript Auth
- AWS SDK for JavaScript v3
- IAM roles and Amazon SNS for SMS delivery

## Sources Consulted
- Amazon Cognito Developer Guide: Adding MFA to a user pool: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-mfa.html
- AWS CLI Command Reference: `cognito-idp set-user-pool-mfa-config`: https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/set-user-pool-mfa-config.html
- AWS Amplify Gen 2 Documentation: Multi-factor authentication: https://docs.amplify.aws/react/build-a-backend/auth/concepts/multi-factor-authentication/
- AWS Amplify JS API Documentation: `updateMFAPreference`: https://aws-amplify.github.io/amplify-js/api/functions/aws_amplify.auth.updateMFAPreference.html
- Terraform AWS Provider Documentation: `aws_cognito_user_pool`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- Amazon Cognito API Reference: `AdminGetUser`: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminGetUser.html

## Issues Found
- The post said Cognito supports only TOTP and SMS MFA. Current Cognito and Amplify documentation also includes email MFA, so the introduction was updated to acknowledge email MFA while keeping the post scoped to TOTP and SMS.
- The post said a pool set to required MFA can't be changed back to off without creating a new user pool. Official Cognito documentation describes the MFA setting as configurable to optional, required, or off. The text was corrected to the actual limitation: with required MFA, users can't enable or disable MFA methods for themselves.
- The AWS CLI example omitted `SnsRegion` and used ambiguous nested quoting in the shorthand value. The command was updated to match the documented shorthand syntax with escaped quotes and an explicit SNS region.
- The Amplify TOTP example passed an account identifier as a second argument to `getSetupUri`. The current Amplify documentation shows `getSetupUri(appName)`, so the extra argument was removed.
- The SMS MFA section did not mention the required user phone number. A short prerequisite note was added.
- The admin example logged `response.MFAOptions`, which the Cognito API reference says is no longer supported and only provides SMS MFA information. It now logs `response.UserMFASettingList`.

## Review Notes
The Terraform and AWS SDK snippets are otherwise aligned with current provider/API field names. SMS delivery still requires production SMS prerequisites such as an origination number and SNS sandbox considerations, which the AWS CLI documentation calls out; the post could expand on those operational details in a future update.
