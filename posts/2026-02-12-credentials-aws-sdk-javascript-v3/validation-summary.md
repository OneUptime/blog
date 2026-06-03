# Validation Summary: How to Handle Credentials in AWS SDK for JavaScript v3

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS SDK for JavaScript v3
- Node.js
- AWS credentials and credential provider chain
- IAM roles and AWS STS
- IAM Identity Center (AWS SSO)
- Amazon EKS web identity tokens
- AWS CLI shared config and credentials files
- Amazon ECS, Amazon EC2, and AWS Lambda execution environments

## Sources Consulted
- AWS SDK for JavaScript v3 Developer Guide: Set credentials in Node.js: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/setting-credentials-node.html
- AWS SDK for JavaScript v3 Developer Guide: Credential providers: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-credential-providers.html
- AWS SDK for JavaScript v3 API Reference: @aws-sdk/credential-providers: https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-credential-providers/
- AWS CLI User Guide: Configuring IAM Identity Center authentication: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-sso.html
- AWS CLI User Guide: Configuration and credential file settings: https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html
- AWS SDK for JavaScript v3 Developer Guide: Load credentials for a Node.js Lambda function: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-node-credentials-lambda.html
- AWS SDK for JavaScript v3 STS examples: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/javascript_sts_code_examples.html
- AWS SDK for JavaScript v3 API Reference: GetCallerIdentityCommand: https://docs.aws.amazon.com/goto/SdkForJavaScriptV3/sts-2011-06-15/GetCallerIdentity
- AWS STS API Reference: AssumeRole: https://docs.aws.amazon.com/STS/latest/APIReference/API_AssumeRole.html
- OneUptime referenced post: How to Set Up AWS SDK v3 Clients in Node.js: https://oneuptime.com/blog/post/2026-02-12-aws-sdk-v3-clients-nodejs/view
- OneUptime referenced post: How to Use LocalStack to Test AWS Services Locally: https://oneuptime.com/blog/post/2026-02-12-localstack-test-aws-services-locally/view

## Issues Found
- The default credential provider chain order was inaccurate and incomplete. Updated it to match the current AWS SDK for JavaScript v3 Node.js documentation, including IAM Identity Center, shared config and credentials files, login credentials, process credentials, web identity token credentials, ECS credentials, and EC2 instance metadata credentials.
- Lambda execution role credentials were grouped with EC2 and ECS metadata credentials. Clarified that Lambda execution roles provide credentials automatically and do not normally require explicit credential configuration.
- The IAM Identity Center config example used the older legacy non-refreshable profile format. Updated it to the recommended `sso-session` configuration with `sso_registration_scopes`.
- The EKS web identity example used `fromWebToken` and manually read the token file. Updated it to use `fromTokenFile` with `webIdentityTokenFile`, which is the documented SDK v3 provider for token files used by EKS.
- The custom caching example defined a class with a `resolve()` method, but AWS SDK v3 clients expect a credential object or a provider function. Reworked the example to return an async credential provider function.

## Review Notes
The examples use top-level `await`, so they are intended for ES modules or runtimes that support top-level await. The post's `fromSSO` example is still valid, but the default provider chain can also resolve the selected profile when `AWS_PROFILE` is set.
