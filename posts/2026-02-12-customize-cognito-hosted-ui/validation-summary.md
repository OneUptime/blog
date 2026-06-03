# Validation Summary: How to Customize the Cognito Hosted UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito user pools
- Cognito Hosted UI (classic)
- AWS CLI
- Terraform AWS provider
- Cognito message templates
- Cognito Custom Message Lambda trigger
- JavaScript / AWS Lambda
- Amazon SES email configuration

## Sources Consulted
- Amazon Cognito Developer Guide: Customizing hosted UI (classic) branding - https://docs.aws.amazon.com/cognito/latest/developerguide/hosted-ui-classic-branding.html
- AWS CLI Command Reference: cognito-idp set-ui-customization - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/set-ui-customization.html
- Terraform Registry: aws_cognito_user_pool_ui_customization - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_ui_customization
- Terraform Registry: aws_cognito_user_pool - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- Amazon Cognito Developer Guide: Configuring MFA, authentication, verification and invitation messages - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-message-customizations.html
- Amazon Cognito Developer Guide: Custom message Lambda trigger - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html
- AWS CloudFormation Template Reference: VerificationMessageTemplate - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cognito-userpool-verificationmessagetemplate.html
- AWS CloudFormation Template Reference: InviteMessageTemplate - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cognito-userpool-invitemessagetemplate.html

## Issues Found
- The post implied all hosted UI pages are broadly customizable through CSS. Updated the wording to clarify that the CSS/logo branding path applies to Hosted UI (classic) branding.
- The Terraform UI customization examples used `aws_cognito_user_pool.main.id` directly. Updated them to use `aws_cognito_user_pool_domain.main.user_pool_id`, matching the Terraform provider recommendation so the customization depends on an active user-pool domain.
- The CSS sample included unsupported selectors such as `.modal-content`, `.modalCustomizable`, `.anchor-customizable`, `.tabBar-customizable`, `.tab-customizable`, `.footer-customizable`, `body`, and `.password-requirements-customizable`. Replaced them with documented Cognito Hosted UI (classic) selectors, including `.background-customizable`, `.idpButton-customizable`, `.idpDescription-customizable`, `.passwordCheck-valid-customizable`, `.passwordCheck-notValid-customizable`, and `.redirect-customizable`.
- The logo description omitted JPEG as a documented accepted extension. Updated the comment to list JPG, JPEG, and PNG.
- The limitations section listed the CSS and logo limits but omitted the combined `SetUICustomization` request-size limit. Added a note that CSS, logo, and headers must fit within the 135KB request limit.
- The email template and Custom Message Lambda sections did not mention that custom email bodies and subjects require the user pool to send email through Amazon SES (`EmailSendingAccount` / Terraform `email_sending_account = "DEVELOPER"`). Added that caveat and an SES email configuration block to the Terraform example.

## Review Notes
The CSS and logo customization approach is correct for Hosted UI (classic). Amazon Cognito also has newer managed login branding, which uses a different branding editor and should be covered separately if the post is expanded in the future.
