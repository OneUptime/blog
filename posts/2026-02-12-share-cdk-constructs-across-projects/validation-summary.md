# Validation Summary: How to Share CDK Constructs Across Projects

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- TypeScript
- npm packages and workspaces
- Amazon S3 CDK constructs
- Amazon VPC CDK constructs
- AWS CodeArtifact
- GitHub Packages

## Sources Consulted
- AWS CDK CLI `cdk init` documentation: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-init.html
- AWS CDK TypeScript dependency guidance for construct libraries: https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-typescript.html
- AWS CDK `BucketProps` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_s3.BucketProps.html
- AWS CDK `Vpc` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.Vpc.html
- AWS CDK assertions `Template` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
- Amazon S3 server access logging documentation: https://docs.aws.amazon.com/AmazonS3/latest/userguide/ServerLogs.html
- AWS CodeArtifact npm authentication documentation: https://docs.aws.amazon.com/codeartifact/latest/ug/npm-auth.html
- GitHub Packages npm registry documentation: https://docs.github.com/packages/using-github-packages-with-your-projects-ecosystem/configuring-npm-for-use-with-github-packages
- npm publish documentation: https://docs.npmjs.com/commands/npm-publish/
- npm workspaces documentation: https://docs.npmjs.com/cli/v8/using-npm/workspaces/

## Issues Found
- The `SecureBucket` construct set `serverAccessLogsPrefix` while also using `ObjectOwnership.BUCKET_OWNER_ENFORCED`. In current CDK, enabling access logs to the current bucket can cause CDK to configure log-delivery ACL behavior that conflicts with bucket-owner-enforced object ownership. Removed `serverAccessLogsPrefix` from the example.
- The first unit test expected `SSEAlgorithm: 'aws:kms'`, but the construct uses `BucketEncryption.S3_MANAGED` when no KMS key is supplied. S3-managed encryption synthesizes as `AES256`, so the assertion was updated to `SSEAlgorithm: 'AES256'`.

## Review Notes
The patched construct examples were also checked locally with current `aws-cdk-lib` and `constructs`; the S3 assertions passed and the S3/VPC constructs synthesized without CDK validation errors. The package examples use older minimum versions (`aws-cdk-lib` `^2.100.0`, `constructs` `^10.0.0`) but the dependency pattern remains consistent with AWS CDK guidance for construct libraries.
