# Validation Summary: How to Use CodeCatalyst Workflows for CI/CD

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon CodeCatalyst Workflows
- AWS CodeCatalyst build and test actions
- AWS CDK deploy action
- AWS CloudFormation deployment concepts
- Amazon ECR
- Docker
- Node.js and npm
- YAML workflow configuration

## Sources Consulted
- AWS CodeCatalyst workflow YAML definition: https://docs.aws.amazon.com/codecatalyst/latest/userguide/workflow-reference.html
- AWS CodeCatalyst trigger examples: https://docs.aws.amazon.com/codecatalyst/latest/userguide/workflows-add-trigger-examples.html
- AWS CodeCatalyst build and test action YAML reference: https://docs.aws.amazon.com/codecatalyst/latest/userguide/build-action-ref.html
- AWS CodeCatalyst AWS CDK deploy action YAML reference: https://docs.aws.amazon.com/codecatalyst/latest/userguide/cdk-dep-action-ref.html
- AWS CodeCatalyst variables documentation: https://docs.aws.amazon.com/codecatalyst/latest/userguide/workflows-working-with-variables.html
- AWS CodeCatalyst predefined source variables: https://docs.aws.amazon.com/codecatalyst/latest/userguide/workflows-sources-variables.html
- AWS CodeCatalyst secrets documentation: https://docs.aws.amazon.com/codecatalyst/latest/userguide/workflows-secrets.html
- AWS CodeCatalyst artifact sharing documentation: https://docs.aws.amazon.com/codecatalyst/latest/userguide/workflows-working-artifacts.html
- AWS CodeCatalyst artifact reference examples: https://docs.aws.amazon.com/codecatalyst/latest/userguide/workflows-working-artifacts-ex.html
- AWS CodeCatalyst compute and runtime image documentation: https://docs.aws.amazon.com/codecatalyst/latest/userguide/workflows-working-compute.html
- AWS CodeCatalyst service page: https://aws.amazon.com/codecatalyst/

## Issues Found
- Added a current availability caveat. AWS states that Amazon CodeCatalyst is no longer open to new customers as of November 7, 2025, and that no new features are planned beyond security, availability, and performance enhancements.
- Corrected trigger type values from `Push`, `PullRequest`, and `Schedule` to the documented YAML values `PUSH`, `PULLREQUEST`, and `SCHEDULE`.
- Corrected the schedule expression from EventBridge-style `cron(...)` syntax to CodeCatalyst's documented six-field cron expression format.
- Corrected branch and file filters to use regular expression patterns instead of glob-style patterns.
- Corrected the manual trigger example. CodeCatalyst manual runs are configured by omitting the `Triggers` section, not by declaring `Type: Manual`.
- Updated AWS CDK deploy action identifiers from `aws/cdk-deploy@v1` to `aws/cdk-deploy@v2`.
- Removed artifact inputs from the CDK deploy actions because the AWS CDK deploy action allows either a source input or an artifact input, but not both.
- Updated `npm ci --production` to `npm ci --omit=dev` to use the current npm option for omitting development dependencies.
- Clarified the secrets example so it does not imply CodeCatalyst secrets are automatically exposed as environment variables.
- Added `WorkflowSource` to the environment variable example so the build action has source files available.
- Corrected the documented x86-64 on-demand fleet sizes to `Large`, `XLarge`, and `2XLarge` with their current vCPU and memory values.
- Clarified artifact input wording so it matches CodeCatalyst behavior for a single primary artifact input.
- Updated the best-practice note about manual testing to refer to starting workflows manually from the console.

## Review Notes
The examples remain illustrative and still require project-specific AWS account connections, IAM roles, ECR repositories, CDK stack code, and application scripts to exist before they can run successfully.
