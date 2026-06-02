# Validation Summary: How to Set Up IAM Roles for Web Identity Federation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS IAM
- AWS STS
- Amazon Cognito identity pools
- OpenID Connect (OIDC)
- AWS CLI
- AWS SDK for JavaScript v3
- GitHub Actions OIDC
- Terraform AWS provider
- Amazon S3
- Amazon DynamoDB

## Sources Consulted
- AWS CLI Command Reference: create-identity-pool: https://docs.aws.amazon.com/cli/latest/reference/cognito-identity/create-identity-pool.html
- AWS CLI Command Reference: create-open-id-connect-provider: https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- Amazon Cognito Developer Guide: IAM roles for identity pools: https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html
- AWS SDK for JavaScript v3 Developer Guide: Amazon Cognito Identity credentials: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/loading-browser-credentials-cognito.html
- AWS SDK for JavaScript v3 Developer Guide: credential providers: https://docs.aws.amazon.com/sdk-for-javascript/v3/developer-guide/migrate-credential-providers.html
- AWS IAM User Guide: Create an OIDC identity provider in IAM: https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc.html
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- Terraform AWS provider documentation: aws_iam_openid_connect_provider: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- OneUptime linked SAML guide: https://oneuptime.com/blog/post/2026-02-12-use-iam-roles-with-external-identity-providers-saml/view

## Issues Found
- The `create-identity-pool` command used `--allow-unauthenticated-identities false`. AWS CLI models this as a boolean flag pair, so the example now uses `--no-allow-unauthenticated-identities`.
- The `--supported-login-providers` example passed providers as separate arguments. AWS CLI documents this option as a map shorthand, so the example now uses a comma-separated map.
- The Cognito JavaScript example imported `fromCognitoIdentityPool` from the internal package and passed `client`. The example now uses the public `@aws-sdk/credential-providers` package and `clientConfig`, matching AWS SDK v3 documentation.
- The direct OIDC setup used Google in `create-open-id-connect-provider`. AWS documents Google, Facebook, and Amazon Cognito as built-in web identity providers that should not be registered with that IAM OIDC-provider procedure. The example now uses a custom OIDC issuer.
- The direct OIDC trust policy only checked `aud`, while the post recommends scoping by audience and subject. The trust policy now includes a `sub` condition.
- The GitHub Actions example used `aws-actions/configure-aws-credentials@v4`. The example now uses the current major version, `@v6`.
- The Terraform GitHub OIDC provider included the historical GitHub thumbprint. Current AWS and Terraform provider guidance says thumbprints are optional and ignored for GitHub, so the stale value was removed.

## Review Notes
The AWS CLI was not installed locally, so command validation was performed against official AWS CLI documentation instead of local `--help` output. The Terraform CLI was also unavailable locally, so Terraform validation was performed against the official Terraform Registry documentation.
