# Validation Summary: How to Set Up CI/CD for Lambda Functions with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda
- AWS IAM and OpenID Connect (OIDC)
- AWS CLI
- GitHub Actions
- aws-actions/configure-aws-credentials
- Node.js and npm
- Python and pip
- AWS SAM
- AWS CDK

## Sources Consulted
- AWS CLI Command Reference: `lambda update-function-code` - https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-code.html
- AWS CLI Command Reference: Lambda waiters - https://docs.aws.amazon.com/cli/latest/reference/lambda/wait/index.html
- AWS CLI Command Reference: `iam create-open-id-connect-provider` - https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- AWS IAM User Guide: OIDC provider thumbprints - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- GitHub Docs: OpenID Connect reference - https://docs.github.com/en/actions/reference/security/oidc
- GitHub Docs: Deployments and environments - https://docs.github.com/en/actions/reference/deployments-and-environments
- AWS Lambda Developer Guide: Lambda runtimes - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- AWS Lambda Developer Guide: Deploy Node.js Lambda functions with .zip file archives - https://docs.aws.amazon.com/lambda/latest/dg/nodejs-package.html
- AWS Lambda Developer Guide: Working with .zip file archives for Python Lambda functions - https://docs.aws.amazon.com/lambda/latest/dg/python-package.html
- AWS Lambda Developer Guide: Lambda IAM permissions reference - https://docs.aws.amazon.com/lambda/latest/dg/lambda-api-permissions-ref.html
- AWS Lambda Service Authorization Reference - https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslambda.html
- npm CLI documentation: `npm ci` - https://docs.npmjs.com/cli/commands/npm-ci/
- AWS SAM CLI Command Reference: `sam deploy` - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/sam-cli-command-reference-sam-deploy.html
- AWS CDK v2 CLI Reference - https://docs.aws.amazon.com/cdk/v2/guide/cli.html

## Issues Found
- Updated all GitHub Actions Node.js setup examples from Node.js 20 to Node.js 22. AWS Lambda lists Node.js 20 as deprecated as of April 30, 2026, while Node.js 22 remains supported.
- Replaced `npm ci --production` with `npm ci --omit=dev`, which is the current npm-documented way to omit development dependencies during install.
- Removed the hard-coded GitHub OIDC thumbprint from the `aws iam create-open-id-connect-provider` command. Current AWS IAM behavior can retrieve the thumbprint automatically, and AWS now verifies OIDC provider TLS certificates through trusted root CAs where applicable.
- Added `permissions: id-token: write` and `contents: read` to the multi-environment GitHub Actions workflow. GitHub requires `id-token: write` for workflows or jobs that request OIDC tokens.
- Added `lambda:GetAlias` to the IAM permissions because the rollback example uses `aws lambda get-alias`.
- Expanded the Lambda IAM `Resource` field to include both the unqualified function ARN and qualified version/alias ARN pattern, so alias-related actions are covered.
- Changed the production environment comment from saying it requires manual approval to saying it can require manual approval if required reviewers are configured. GitHub environments only block for approval when deployment protection rules are configured.

## Review Notes
The post is technically relevant and the remaining commands and snippets are consistent with current AWS CLI, GitHub Actions, AWS SAM, AWS CDK, Lambda zip packaging, and Python packaging documentation. The examples are illustrative and still require users to substitute their own function names, IAM role ARNs, regions, handler configuration, and test commands.
