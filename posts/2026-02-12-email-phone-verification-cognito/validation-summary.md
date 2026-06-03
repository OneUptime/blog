# Validation Summary: How to Set Up Email and Phone Verification in Cognito

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito User Pools
- Amazon SES
- Amazon SNS SMS
- AWS IAM
- AWS CLI
- Terraform AWS provider
- AWS Amplify JavaScript Auth
- AWS Lambda triggers

## Sources Consulted
- Amazon Cognito VerificationMessageTemplateType API Reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_VerificationMessageTemplateType.html
- Amazon Cognito message customization guide: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-message-customizations.html
- Amazon Cognito email settings guide: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-email.html
- Amazon Cognito quotas: https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html
- Amazon Cognito SMS message settings: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-sms-settings.html
- Amazon Cognito SmsConfigurationType API Reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_SmsConfigurationType.html
- Amazon Cognito custom message Lambda trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html
- Amazon Cognito pre sign-up Lambda trigger: https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
- AWS CLI sns set-sms-attributes command reference: https://docs.aws.amazon.com/cli/latest/reference/sns/set-sms-attributes.html
- AWS Amplify JavaScript Auth sign-up documentation: https://docs.amplify.aws/nextjs/build-a-backend/auth/connect-your-frontend/sign-up/
- AWS Amplify JavaScript manage user attributes documentation: https://docs.amplify.aws/javascript/frontend/auth/manage-user-attributes/
- AWS Amplify JS API Reference for Auth functions and output types: https://aws-amplify.github.io/amplify-js/api/modules/aws_amplify.auth.html
- Terraform Registry documentation for aws_cognito_user_pool: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool

## Issues Found
- The default Cognito email sender example configured custom `email_subject` and `email_message` while using `email_sending_account = "COGNITO_DEFAULT"`. Amazon Cognito only permits custom email subjects and bodies when the user pool uses Amazon SES with `EmailSendingAccount` set to `DEVELOPER`. I removed the custom subject/body from the default sender example and clarified that custom email templates require SES.
- The SES production example configured Cognito to use SES but did not show where the custom verification subject/body should go after they were removed from the default sender example. I added the `verification_message_template` to the SES-backed user pool snippet.
- The verification-link example used custom link subject/body fields without showing SES configuration. I added an SES-backed `email_configuration` block to keep the Terraform snippet valid for custom link templates.

## Review Notes
- The post's statement that Cognito's default email sender has a 50-email-per-day quota is correct for the default email feature, and the quota is non-adjustable.
- The SMS IAM role and `sns:Publish` policy are technically valid. For production, AWS recommends adding `aws:SourceAccount` and `aws:SourceArn` conditions to the trust policy in addition to `sts:ExternalId`.
- The Cognito verification link flow uses a user pool domain in the generated confirmation URL.
- The Amplify examples use current modular Auth imports from `aws-amplify/auth` and match the current v6 API shape.
