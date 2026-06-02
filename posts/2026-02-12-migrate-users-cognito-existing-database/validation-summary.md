# Validation Summary: How to Migrate Users to Cognito from an Existing Database

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Cognito user pools
- Amazon Cognito user migration Lambda triggers
- AWS Lambda
- AWS CLI
- Node.js
- MySQL
- bcrypt
- Node.js crypto module
- CSV user import

## Sources Consulted
- Amazon Cognito Developer Guide: Importing users into a user pool - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-import-users.html
- Amazon Cognito Developer Guide: Migrate user Lambda trigger - https://docs.aws.amazon.com/cognito/latest/developerguide/user-pool-lambda-migrate-user.html
- Amazon Cognito Developer Guide: Importing users into user pools from a CSV file - https://docs.aws.amazon.com/cognito/latest/developerguide/cognito-user-pools-using-import-tool.html
- AWS CLI Command Reference: create-user-import-job - https://docs.aws.amazon.com/cli/latest/reference/cognito-idp/create-user-import-job.html
- Amazon Cognito API Reference: UpdateUserPool - https://docs.aws.amazon.com/cognito-user-identity-pools/latest/APIReference/API_UpdateUserPool.html
- Node.js API documentation: crypto.pbkdf2 - https://nodejs.org/api/crypto.html

## Issues Found
- The CSV import example used a shortened header. AWS documentation says the import file should use the downloaded user pool CSV header and include all header columns, with blank values allowed for optional columns. Updated the sample CSV and generator script to use the full template-style header with blanks for unused attributes.
- The CSV generator removed commas from names instead of escaping them. AWS documentation specifies escaping commas with a backslash in import CSV attribute values. Updated the script to escape commas.
- The CSV upload command used a generic PUT with `Content-Type: text/csv`. AWS documentation shows uploading to the import job presigned URL with `curl -T` and the `x-amz-server-side-encryption:aws:kms` header. Updated the command accordingly.
- The `update-user-pool` example didn't warn that omitted user pool settings can reset to defaults. Added a note to include existing user pool settings when attaching the Lambda trigger.
- The PBKDF2 password verification callback called `reject(err)` without returning and used `parseInt` without an explicit radix. Updated it to `return reject(err)` and `parseInt(iterations, 10)`.

## Review Notes
The lazy migration explanation, trigger source names, response fields, bulk import job commands, and statement that CSV import doesn't import passwords are consistent with AWS documentation. The examples remain illustrative and assume required custom attributes such as `custom:legacy_id` and `custom:role` already exist in the Cognito user pool schema.
