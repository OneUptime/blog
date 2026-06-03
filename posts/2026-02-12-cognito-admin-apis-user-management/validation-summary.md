# Validation Summary: How to Use Cognito Admin APIs for User Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito user pools
- Cognito admin APIs
- AWS SDK for JavaScript v3
- IAM policies
- Express.js

## Sources Consulted
- AWS Cognito AdminCreateUser API Reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminCreateUser.html
- AWS Cognito ListUsers API Reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListUsers.html
- AWS Cognito managing and searching user accounts guide: https://docs.aws.amazon.com/cognito/latest/developerguide/how-to-manage-user-accounts.html
- AWS Cognito AdminSetUserPassword API Reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminSetUserPassword.html
- AWS Cognito ListUsersInGroup API Reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_ListUsersInGroup.html
- AWS Cognito AdminAddUserToGroup API Reference: https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_AdminAddUserToGroup.html
- AWS Cognito user pool groups guide: https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-user-groups.html
- AWS SDK for JavaScript v3 CognitoIdentityProviderClient documentation: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/client/cognito-identity-provider/
- AWS service authorization reference for Amazon Cognito User Pools: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazoncognitouserpools.html

## Issues Found
- The create-user section said the example sent an invitation email, but the code used `MessageAction: 'SUPPRESS'`, which explicitly suppresses invitation delivery. Updated the text to say the example creates a user without sending an invitation.
- The `MessageAction` comments said `RESEND` sends an invitation email. AWS documents `RESEND` as resending an invitation to an existing user and resetting the temporary-password duration. Updated the comments accordingly.
- The temporary password comment said Cognito generated a temporary password inside the `if (tempPassword)` branch, but that branch provides a caller-supplied temporary password. Updated the comment.
- The search section implied Cognito can search any attributes and included a server-side custom attribute filter. AWS documents that `ListUsers` only searches supported standard attributes and custom attributes aren't searchable. Removed the custom attribute search example and clarified the limitation.
- The confirmed-user search example used `status = "Confirmed"`. AWS documents `cognito:user_status` for user status searches, with values such as `CONFIRMED`. Updated the example to `cognito:user_status = "CONFIRMED"`.
- The Express example interpolated request input directly into a Cognito filter string. AWS requires quotes inside filter values to be escaped, so added a small escaping helper and used it when building the email prefix filter.
- The IAM policy was described as the minimum policy, but the exact minimum depends on which operations the backend exposes. Updated the wording to describe it as an example scoped policy.

## Review Notes
- The examples use the current AWS SDK for JavaScript v3 package and command names.
- The group management, password management, and pagination examples match the current Cognito API parameter names and pagination token behavior.
- Custom attributes used in update examples must already exist in the user pool schema and be mutable for updates to succeed.
