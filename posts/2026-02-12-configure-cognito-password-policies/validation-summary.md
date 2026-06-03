# Validation Summary: How to Configure Cognito Password Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito User Pools
- AWS CLI
- Terraform AWS provider
- AWS SDK for JavaScript v3
- AWS Amplify Auth
- AWS Lambda triggers
- NIST SP 800-63B
- PCI DSS

## Sources Consulted
- Amazon Cognito Developer Guide: Passwords, account recovery, and password policies - https://docs.aws.amazon.com/cognito/latest/developerguide/managing-users-passwords.html
- Amazon Cognito Developer Guide: Pre sign-up Lambda trigger - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-pre-sign-up.html
- AWS CLI Command Reference: cognito-idp update-user-pool - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/update-user-pool.html
- AWS CloudFormation Reference: AWS::Cognito::UserPool PasswordPolicy - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cognito-userpool-passwordpolicy.html
- Terraform Registry: aws_cognito_user_pool - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- AWS SDK for JavaScript v3: AdminSetUserPasswordCommand - https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-cognito-identity-provider/Class/AdminSetUserPasswordCommand/
- AWS Amplify Documentation: Manage passwords - https://docs.amplify.aws/javascript/build-a-backend/auth/manage-users/manage-passwords/
- NIST SP 800-63B, Digital Identity Guidelines - https://pages.nist.gov/800-63-4/sp800-63b.html
- PCI DSS v4.0 Self-Assessment Questionnaire references for Requirement 8.3.6 - https://www.pcisecuritystandards.org/document_library

## Issues Found
- The post claimed a Pre Sign-Up Lambda trigger could validate a user's plaintext password. Cognito's pre sign-up trigger request includes user attributes, validation data, and client metadata, but not the plaintext password. I replaced the Lambda trigger example with an application-side validator and an Amplify `signUp` wrapper that runs before submitting the password to Cognito.
- The AWS CLI `update-user-pool` example omitted the important Cognito behavior that unspecified user-pool settings reset to defaults. I added a short warning comment before the command.
- The Terraform comment described temporary password validity as 1-365 days. The Cognito API accepts 0-365, with 0 treated as a null value that uses the Cognito default. I updated the comment.
- The post described `"correct-horse-battery-staple"` as a 16-character passphrase. I changed this to "a long passphrase" because the example is longer than 16 characters.
- The PCI DSS bullet used the older seven-character minimum. I updated it to the current PCI DSS v4 guidance: 12 characters, or 8 when the system doesn't support 12, with numeric and alphabetic characters.
- The NIST bullet used the older simplified minimum of 8 characters. I updated it for the current SP 800-63B guidance: 15 characters for single-factor passwords, 8 characters when used as part of MFA, blocklist checks, and no composition rules.
- The summary still referred to "custom Lambda validation." I changed it to application-side validation before submitting passwords to Cognito.

## Review Notes
The Terraform, AWS SDK v3, and Amplify Auth examples use current field names and API imports. Cognito now also supports password history for Essentials and Plus feature tiers, but the omission is not technically incorrect for this post's scope.
