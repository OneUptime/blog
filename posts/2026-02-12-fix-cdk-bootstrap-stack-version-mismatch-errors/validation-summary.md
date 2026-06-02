# Validation Summary: How to Fix CDK 'Bootstrap stack version mismatch' Errors

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS CDK v2
- AWS CDK CLI
- AWS CloudFormation
- AWS Systems Manager Parameter Store
- Amazon S3
- Amazon ECR
- AWS IAM
- GitHub Actions

## Sources Consulted
- AWS CDK Developer Guide: Bootstrapping: https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping.html
- AWS CDK Developer Guide: Bootstrap your environment: https://docs.aws.amazon.com/cdk/v2/guide/bootstrapping-env.html
- AWS CDK CLI reference: `cdk bootstrap`: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-bootstrap.html
- AWS CDK Developer Guide: Customize CDK stack synthesis: https://docs.aws.amazon.com/cdk/v2/guide/customize-synth.html
- AWS CDK API Reference: `DefaultStackSynthesizerProps`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.DefaultStackSynthesizerProps.html
- AWS CDK Developer Guide: Permissions boundaries: https://docs.aws.amazon.com/cdk/v2/guide/customize-permissions-boundaries.html
- Local AWS CDK CLI help output: `npx cdk bootstrap --help`

## Issues Found
- The bootstrap version table mapped several features to incorrect template versions. I replaced it with an accurate subset from the official AWS CDK bootstrap template version history, including the SSM version parameter, lookup role, `cdk import`, deploy-role SSM permissions, `cdk rollback` permissions, and newer bucket lifecycle updates.
- The package-version note implied `npm ls aws-cdk-lib` would show bootstrap version requirements. I changed it to say this command identifies the CDK library version in use; the actual required bootstrap version is reported by the deployment error or synthesized template rule.
- The cross-account bootstrap wording said both accounts need trust relationships. I clarified that the target account needs to trust the CI/CD account, while the CI/CD account should also be bootstrapped when it hosts the pipeline or CDK assets.

## Review Notes
The CDK commands and flags in the post are current for the installed CDK CLI and align with AWS documentation. The custom qualifier examples are valid with the current bootstrap template constraint of an alphanumeric, underscore, or hyphen identifier up to 10 characters. The OneUptime internal link returned HTTP 200.
