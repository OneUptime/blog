# Validation Summary: How to Integrate IAM Identity Center with Google Workspace

## Status
validated

## Post Type
Tutorial / integration guide

## Technologies Covered
- AWS IAM Identity Center
- AWS Identity Store API and AWS CLI
- Google Workspace SAML applications
- Google Workspace automated user provisioning
- SAML 2.0
- SCIM 2.0
- AWS Lambda
- Google Admin SDK Directory API
- EventBridge scheduled rules
- AWS CLI SSO

## Sources Consulted
- AWS IAM Identity Center User Guide: Configure SAML and SCIM with Google Workspace and IAM Identity Center - https://docs.aws.amazon.com/singlesignon/latest/userguide/gs-gwp.html
- AWS IAM Identity Center User Guide: Provision users and groups from an external identity provider using SCIM - https://docs.aws.amazon.com/singlesignon/latest/userguide/provision-automatically.html
- AWS IAM Identity Center User Guide: External identity providers - https://docs.aws.amazon.com/singlesignon/latest/userguide/manage-your-identity-source-idp.html
- AWS CLI Command Reference: identitystore create-user - https://docs.aws.amazon.com/cli/latest/reference/identitystore/create-user.html
- AWS CLI Command Reference: identitystore list-users - https://docs.aws.amazon.com/cli/latest/reference/identitystore/list-users.html
- AWS CLI Command Reference: identitystore get-user-id - https://docs.aws.amazon.com/cli/latest/reference/identitystore/get-user-id.html
- Boto3 documentation: identitystore create_user and list_users - https://docs.aws.amazon.com/boto3/latest/reference/services/identitystore.html
- Google Workspace Admin Help: Configure Amazon Web Services user provisioning - https://support.google.com/a/answer/13047358
- Google Workspace Admin Help: Set up your own custom SAML app - https://support.google.com/a/answer/6087519
- Google Workspace Admin Help: Amazon Web Services cloud app - https://support.google.com/a/answer/6194963
- Google Admin SDK Directory API: users.list - https://developers.google.com/workspace/admin/directory/reference/rest/v1/users/list

## Issues Found
- The post incorrectly stated that Google Workspace does not have a native SCIM integration with IAM Identity Center through the Admin Console. Updated Step 6 to describe Google Workspace autoprovisioning for the Amazon Web Services app using the IAM Identity Center SCIM endpoint and access token. AWS and Google both document this flow; the current limitation is automatic group provisioning, not user provisioning.
- The post described creating a custom SAML app as the main path. Updated the setup to use the documented Google Workspace "Amazon Web Services (SAML)" app, which is the app tied to the documented AWS/Google SAML and SCIM flow.
- The SAML attribute mapping used generic `firstName`, `lastName`, and `email` app attributes. Updated the mappings to the AWS-documented app attributes required by the Google Amazon Web Services SAML app.
- The offboarding command used `identitystore list-users --filters` to look up a user by `UserName`. AWS CLI documentation marks filtering by `UserName` on `list-users` as deprecated, so the snippet now uses `identitystore get-user-id` with a `userName` unique attribute before deleting the user.
- The closing paragraph said the user sync gap needed to be bridged with Lambda. Updated it to say user provisioning is supported through SCIM and the remaining gap is group synchronization.

## Review Notes
- The manual and Lambda sync examples are still useful as fallback options, but teams using the documented Google Workspace Amazon Web Services app should normally prefer native autoprovisioning for users.
- Google Workspace SCIM synchronization to IAM Identity Center is limited to user provisioning. Groups still need to be created manually or synchronized with a tool such as SSOSYNC.
- AWS CLI was not installed in the local environment, so CLI validation was performed against the current official AWS CLI command reference instead of local `--help` output.
