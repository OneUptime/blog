# Validation Summary: How to Use Projen to Manage CDK Project Configuration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Projen
- AWS CDK v2
- TypeScript
- Jest
- ESLint
- GitHub Actions
- npm

## Sources Consulted
- Projen introduction and project types: https://projen.io/docs/introduction/
- Projen workflow and generated file guidance: https://projen.io/docs/introduction/the-projen-workflow/
- Projen tasks documentation: https://projen.io/docs/concepts/tasks/
- Projen AWS CDK API reference: https://projen.io/docs/api/awscdk/
- Projen TypeScript and Node project API definitions from projen 0.99.70
- AWS CDK assertions API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.assertions.Template.html
- GitHub Actions workflow syntax: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax
- actions/checkout documentation: https://github.com/actions/checkout
- actions/setup-node documentation: https://github.com/actions/setup-node
- npm package metadata for projen and aws-cdk-lib

## Issues Found
- The CDK examples used `cdkVersion: '2.130.0'`, which is outdated as of this review. Updated the examples to `2.257.0`, the current `aws-cdk-lib` release verified from npm.
- The Jest `coverageThreshold` example used Jest's raw `global` nesting, but Projen's typed `CoverageThreshold` option expects `branches`, `functions`, `lines`, and `statements` directly. Updated the snippet to match Projen's current API.
- The testing section added a `test:watch` task, but current generated `AwsCdkTypeScriptApp` projects already include that task, so the example would throw a duplicate task error. Changed the example to add a distinct `test:coverage` task.
- The CI/CD section used deprecated `buildWorkflowTriggers`. Updated it to `buildWorkflowOptions.workflowTriggers`.
- The GitHub workflow permissions example used string values cast with `as any`. Updated it to use `github.workflows.JobPermission.READ` and removed the unused `idToken` permission because the snippet uses static AWS access key secrets rather than OIDC.
- The GitHub Actions examples used older major versions of `actions/checkout` and `actions/setup-node`. Updated them to `v6`, matching the current documented major versions.
- The reusable project template accepted `AwsCdkTypeScriptAppOptions`, which would still require callers to pass `cdkVersion` even though the template supplies a default. Added a `CompanyCdkAppOptions` type that makes `cdkVersion` optional.
- The escape hatch snippet used `TextFile` without importing it. Added `import { TextFile } from 'projen';`.

## Review Notes
The deployment workflow still demonstrates AWS static access key secrets. It is technically valid, but an OIDC-based workflow using `aws-actions/configure-aws-credentials` would generally be preferable for production use.
