# Validation Summary: How to Use Cognito Lambda Triggers (Custom Message)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito user pools
- Cognito Custom Message Lambda triggers
- AWS Lambda
- Amazon SES
- Terraform
- JavaScript / Node.js
- HTML email templates

## Sources Consulted
- Amazon Cognito Developer Guide: Custom message Lambda trigger - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-custom-message.html
- Amazon Cognito Developer Guide: Customizing user pool workflows with Lambda triggers - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-working-with-lambda-triggers.html
- Amazon Cognito Developer Guide: Configuring MFA, authentication, verification and invitation messages - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-settings-message-customizations.html
- AWS Lambda Developer Guide: Building Lambda functions with Node.js - https://docs.aws.amazon.com/lambda/latest/dg/lambda-nodejs.html
- Terraform AWS Provider documentation: aws_cognito_user_pool - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool

## Issues Found
- The post overstated the trigger scope by saying it gives full control over every email and SMS message Cognito sends. Updated the wording to match AWS documentation: the trigger lets you modify supported message contents and subject before Cognito sends them.
- The post implied HTML email customization without mentioning the SES requirement. Updated the introduction and Terraform example to use `email_sending_account = "DEVELOPER"` with an SES identity, because Cognito rejects `emailMessage` and `emailSubject` from the trigger unless the user pool uses Amazon SES.
- The Terraform example used `nodejs20.x`, which is no longer the current Node.js runtime for new Lambda examples as of this review. Updated it to `nodejs22.x`.
- The Terraform handler was `index.handler`, but the JavaScript snippet names the module `custom-message.mjs`. Updated the handler to `custom-message.handler`.
- The complete handler called email template functions without importing them. Added imports from `email-templates.mjs`.
- The email size guidance cited the generic SES 10 MB limit. Replaced it with Cognito's documented custom message limits: 20,000 UTF-8 characters for email and 140 UTF-8 characters for SMS, including the code.

## Review Notes
The sample custom HTML interpolates user attributes directly. That is syntactically valid for a concise blog example, but production code should escape user-controlled values before inserting them into HTML email.
