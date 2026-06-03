# Validation Summary: How to Configure Cognito User Pool Sign-Up and Sign-In

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon Cognito user pools
- AWS Amplify Auth for JavaScript
- AWS SDK for JavaScript v3
- Terraform AWS provider
- AWS Lambda triggers

## Sources Consulted
- Amazon Cognito quotas: https://docs.aws.amazon.com/cognito/latest/developerguide/quotas.html
- Amazon Cognito authentication flows: https://docs.aws.amazon.com/cognito/latest/developerguide/authentication.html
- Amazon Cognito CreateUserPoolClient API: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_CreateUserPoolClient.html
- Amazon Cognito AdminCreateUser API: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminCreateUser.html
- Amazon Cognito administrator-created users: https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-create-user-accounts.html
- Amazon Cognito AdminCreateUserConfig CloudFormation reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-cognito-userpool-admincreateuserconfig.html
- AWS SDK for JavaScript v3 Cognito examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_cognito-identity-provider_code_examples.html
- AWS Amplify JavaScript sign-up docs: https://docs.amplify.aws/javascript/frontend/auth/sign-up/
- AWS Amplify JavaScript sign-in docs: https://docs.amplify.aws/javascript/frontend/auth/sign-in/
- AWS Amplify JavaScript password recovery docs: https://docs.amplify.aws/gen1/javascript/build-a-backend/auth/manage-passwords/
- AWS Amplify JavaScript current user sessions docs: https://docs.amplify.aws/javascript/build-a-backend/auth/connect-your-frontend/manage-user-sessions/
- Amazon Cognito Lambda trigger docs: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-working-with-lambda-triggers.html
- Terraform AWS provider Cognito user pool docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool
- Terraform AWS provider Cognito user pool client docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/cognito_user_pool_client

## Issues Found
- The self-registration Terraform example declared `admin_create_user_config` twice. I combined `allow_admin_create_user_only` and `invite_message_template` into one block because the user pool admin-create settings are one configuration object.
- The Amplify sign-up example set `custom:organization`, but the Terraform example did not define that custom attribute. I added a Cognito user pool `schema` block for `organization` and added `custom:organization` to the app client's writable attributes.
- The app client snippet did not grant write access to the standard `email` and `name` attributes after specifying writable attributes for the custom field. I added `email` and `name` alongside `custom:organization`.
- The pre-sign-up Lambda trigger Terraform snippet attached the trigger but omitted Lambda invoke permission for Cognito. I added an `aws_lambda_permission` resource scoped to the user pool ARN.
- The rate-limit section listed sign-in and token refresh as 200 requests per second. I changed both to 120 requests per second to match the current `UserAuthentication` category quota; sign-up remains 50 requests per second under `UserCreation`.
- The quota-increase guidance said to request increases through AWS Support. I changed it to Service Quotas, which is the current documented path for adjustable Cognito request-rate quotas.

## Review Notes
The JavaScript examples use current Amplify modular Auth APIs and AWS SDK for JavaScript v3 command APIs. The post intentionally uses placeholder pool and client IDs; those must be replaced in a real application.
