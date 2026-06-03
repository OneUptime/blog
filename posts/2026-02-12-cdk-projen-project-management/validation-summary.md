# Validation Summary: How to Use CDK with Projen for Project Management

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- Projen
- TypeScript
- jsii construct libraries
- GitHub Actions
- Node.js/npm

## Sources Consulted
- Projen awscdk API reference: https://projen.io/docs/api/awscdk/
- Projen javascript API reference: https://projen.io/docs/api/javascript/
- Projen AWS CDK construct library documentation: https://projen.io/docs/project-types/aws-cdk-construct-library/
- Projen dependencies documentation: https://projen.io/docs/concepts/dependencies/
- Projen components documentation: https://projen.io/docs/concepts/components/
- Projen getting started documentation: https://projen.io/docs/introduction/getting-started/
- AWS CDK v2 deploy command reference: https://docs.aws.amazon.com/cdk/v2/guide/ref-cli-cmd-deploy.html
- AWS CDK v2 feature flags documentation: https://docs.aws.amazon.com/cdk/v2/guide/featureflags.html
- Current Projen npm package/type declarations for version 0.99.70
- Local `npx projen new --help` output for project type names

## Issues Found
- The dependency upgrade example used `workflowOptions.schedule` as a raw object with a `cron` array. In current Projen, `schedule` expects an `UpgradeDependenciesSchedule`. Updated the snippet to import `javascript` and use `javascript.UpgradeDependenciesSchedule.expressions([...])`.
- The Escape Hatches section incorrectly said the examples told Projen to leave files alone or created a file Projen would not overwrite. `tryFindObjectFile(...).addOverride(...)` customizes a Projen-managed object file, and `new TextFile(..., { marker: false })` still creates a Projen-managed file while suppressing the generated marker. Updated the prose and comments to accurately describe those APIs.

## Review Notes
- The Projen CLI project type names `awscdk-app-ts` and `awscdk-construct` are current in Projen 0.99.70.
- The AWS CDK CLI `--require-approval` values shown in the post are valid for AWS CDK v2.
- The `@aws-cdk/core:stackRelativeExports` context flag is still documented for AWS CDK v2.
- The post pins examples to CDK `2.130.0`; that version is older than the current CDK v2 line, but the examples are still structurally valid and no correction was required for the pinned version.
