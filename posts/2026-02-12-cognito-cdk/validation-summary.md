# Validation Summary: How to Set Up Cognito with CDK

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- Amazon Cognito User Pools
- Amazon Cognito Identity Pools
- AWS Lambda
- AWS IAM
- TypeScript
- OAuth 2.0 / OpenID Connect scopes

## Sources Consulted
- AWS CDK API Reference: UserPoolClientProps - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPoolClientProps.html
- AWS CDK API Reference: StandardAttributes - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.StandardAttributes.html
- AWS CDK API Reference: UserPoolDomainOptions - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.UserPoolDomainOptions.html
- AWS CDK API Reference: Runtime - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Runtime.html
- AWS CDK CLI Reference - https://docs.aws.amazon.com/cdk/v2/guide/cli.html
- AWS Lambda Runtime Support - https://docs.aws.amazon.com/lambda/latest/dg/lambda-runtimes.html
- Amazon Cognito IAM Roles for Identity Pools - https://docs.aws.amazon.com/cognito/latest/developerguide/iam-roles.html
- AWS CDK API Reference: CfnIdentityPoolRoleAttachment - https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_cognito.CfnIdentityPoolRoleAttachment.html

## Issues Found
- The stack declared `public readonly identityPool: cognito.CfnIdentityPool;` but did not initialize it in the constructor in the complete stack example. With strict TypeScript, this fails compilation. Changed it to a definite assignment property, `public readonly identityPool!: cognito.CfnIdentityPool;`, because the Identity Pool is added later in the tutorial.
- The Lambda trigger examples used `lambda.Runtime.NODEJS_20_X`. AWS Lambda lists Node.js 20 as deprecated as of April 30, 2026, while CDK supports `NODEJS_22_X` and AWS Lambda lists Node.js 22 as supported. Updated both Lambda examples to `lambda.Runtime.NODEJS_22_X`.
- The Identity Pool IAM role example created the role with an empty `cognito-identity.amazonaws.com:aud` condition and then added a second trust policy statement later. Cognito identity pool roles must restrict trust to the identity pool with an `aud` condition, and the original pattern could leave an invalid or overly confusing trust policy. Reordered the snippet to create the Identity Pool before the role and used `this.identityPool.ref` directly in the role trust policy with the authenticated `amr` condition.

## Review Notes
- The CDK CLI context examples using `-c environment=...` are valid; AWS CDK documents `--context` / `-c` for runtime context values.
- The Cognito hosted UI domain prefix example is syntactically valid, but real deployments must use a prefix that is unique for the AWS Region and satisfies Cognito domain prefix constraints.
- The resource server snippet creates custom OAuth scopes correctly, but a real app client must also be configured to request any custom scopes it needs.
