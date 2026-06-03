# Validation Summary: How to Use Cognito Lambda Triggers (Post Confirmation)

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon Cognito user pool Lambda triggers
- AWS Lambda
- Terraform AWS provider
- Node.js / JavaScript ES modules
- AWS SDK for JavaScript v3
- Amazon DynamoDB
- Amazon SES
- Amazon SNS
- Cognito user pool groups

## Sources Consulted
- Amazon Cognito Developer Guide: Post confirmation Lambda trigger - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-post-confirmation.html
- Amazon Cognito Developer Guide: Customizing user pool workflows with Lambda triggers - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-working-with-lambda-triggers.html
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS SDK for JavaScript v3 API Reference: DynamoDB PutItemCommand - https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/dynamodb-2012-08-10/PutItem
- Amazon Cognito API Reference: AdminAddUserToGroup - https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminAddUserToGroup.html
- Terraform AWS provider documentation: aws_cognito_user_pool - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- Terraform AWS provider documentation: aws_lambda_permission - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/lambda_permission

## Issues Found
- The post incorrectly said the Post Confirmation trigger does not fire for `AdminConfirmSignUp`. AWS documentation states that user pools invoke this trigger for `ConfirmSignUp`, `AdminConfirmSignUp`, and `ConfirmForgotPassword`; `AdminConfirmSignUp` uses the `PostConfirmation_ConfirmSignUp` trigger source. Updated the trigger-source section and related wording.
- The opening described the trigger as the place for actions that happen once per user lifecycle, but the trigger can also run after confirmed password resets. Adjusted the wording to say it is for actions after confirmation, while the code examples still correctly filter one-time onboarding work to `PostConfirmation_ConfirmSignUp`.
- The Terraform Lambda example used `nodejs20.x`, which is listed as deprecated in the AWS Lambda runtimes table as of this review date. Updated the example to `nodejs22.x`, a supported Node.js runtime.

## Review Notes
The JavaScript examples use current AWS SDK for JavaScript v3 command classes and return the Cognito event object as required. In a production deployment, the Lambda execution role also needs the relevant permissions for each optional action, such as `ses:SendEmail`, `sns:Publish`, and `cognito-idp:AdminAddUserToGroup`, and SES sender identities must be verified according to SES account configuration.
