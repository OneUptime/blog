# Validation Summary: How to Fix Cognito 'UserNotFoundException' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon Cognito user pools
- AWS CLI
- AWS Lambda triggers
- JavaScript AWS SDK usage
- Python boto3 error handling

## Sources Consulted
- Amazon Cognito Developer Guide: User pool case sensitivity - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-case-sensitivity.html
- Amazon Cognito Developer Guide: Working with user attributes - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-settings-attributes.html
- AWS CLI Command Reference: create-user-pool - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-pool.html
- AWS CLI Command Reference: admin-get-user - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/admin-get-user.html
- AWS CLI Command Reference: list-users - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/list-users.html
- Amazon Cognito Developer Guide: Migrate user Lambda trigger - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
- AWS CLI Command Reference: update-user-pool - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/update-user-pool.html
- Amazon Cognito Developer Guide: User pool sign-in with third-party identity providers - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation.html
- Amazon Cognito Developer Guide: Linking federated users to an existing user profile - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-identity-federation-consolidate-users.html
- Amazon Cognito Developer Guide: Managing user existence error responses - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pool-managing-errors.html
- AWS CLI Command Reference: describe-user-pool-client - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/describe-user-pool-client.html

## Issues Found
- The post said Cognito usernames are case-sensitive by default. Updated this to distinguish AWS CLI/API-created pools, where `CaseSensitive` defaults to `true` if omitted, from console-created pools, which are case-insensitive by default.
- The post recommended always lowercasing usernames for existing case-sensitive pools. Updated this to warn that lowercasing only works when the application has consistently standardized usernames, and existing mixed-case accounts need exact stored usernames.
- The alias section incorrectly stated that alias-based users have UUID-style usernames and that admin APIs generally require the real username. Updated the section to explain alias attributes separately from username attributes, including that `AdminGetUser` can accept aliases, while `ListUsers` requires filtering by `email` or the actual `username`.
- The email-as-username section incorrectly stated that the email address is the stored Cognito username. Updated it to reflect AWS documentation: with `UsernameAttributes`, Cognito stores the `username` as a UUID matching `sub`, although email can be used in most APIs except `ListUsers` username filtering.
- Added a caution that `update-user-pool` can reset omitted settings to defaults, so existing configuration should be preserved when attaching a migration Lambda.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was verified against the official AWS CLI command reference instead of local `--help` output. The JavaScript examples are illustrative and omit imports/client initialization, which is acceptable for the post's scope.
