# Validation Summary: How to Set Up Amplify Custom Pipelines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify Hosting
- Amplify build specifications (`amplify.yml`)
- AWS CodePipeline
- AWS CodeBuild buildspec files
- AWS CLI for Amplify
- GitHub Actions
- Cypress end-to-end testing

## Sources Consulted
- AWS Amplify Hosting build specification reference: https://docs.aws.amazon.com/amplify/latest/userguide/yml-specification-syntax.html
- AWS Amplify Hosting build settings and branch-specific scripting: https://docs.aws.amazon.com/amplify/latest/userguide/edit-build-settings.html
- AWS Amplify Hosting Cypress test configuration: https://docs.aws.amazon.com/amplify/latest/userguide/running-tests.html
- AWS CLI `amplify start-job` reference: https://docs.aws.amazon.com/cli/latest/reference/amplify/start-job.html
- AWS CLI `amplify start-deployment` reference: https://docs.aws.amazon.com/cli/latest/reference/amplify/start-deployment.html
- AWS CLI `amplify get-branch` reference: https://docs.aws.amazon.com/cli/latest/reference/amplify/get-branch.html
- AWS CLI `amplify create-webhook` reference: https://docs.aws.amazon.com/cli/latest/reference/amplify/create-webhook.html
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodePipeline action structure reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference.html
- AWS CodePipeline GitHub connections documentation: https://docs.aws.amazon.com/codepipeline/latest/userguide/connections-github.html
- GitHub Actions environments documentation: https://docs.github.com/actions/deployment/targeting-different-environments/using-environments-for-deployment

## Issues Found
- The introduction said the guide covered three approaches, but the post includes four. Changed the count and listed all four approaches.
- The Amplify Cypress example ran Cypress against `http://localhost:3000` without starting or waiting for a local server. Added `wait-on`, started `npm start` in the background, and waited for the local URL before running Cypress.
- The CodePipeline section described an `AmplifyConsole` deploy action, but the current official CodePipeline action reference does not list an Amplify deploy provider. Changed the section to use a CodeBuild action that triggers Amplify through the AWS CLI.
- The CodePipeline `create-pipeline` JSON omitted the required artifact store. Added an S3 `artifactStore`.
- The CodePipeline source action used the older GitHub OAuth action pattern. Updated it to the recommended `CodeStarSourceConnection` GitHub source action configuration.
- The GitHub Actions workflow used `aws amplify start-deployment` without a source URL or deployment job ID. That command is for manual deployments. Changed repository-connected branch releases to `aws amplify start-job --job-type RELEASE`.
- The deployment polling logic only treated `FAILED` as terminal failure. Added `CANCELLED` as a terminal failure state.

## Review Notes
The remaining snippets are intentionally template-style examples and still require real app IDs, bucket names, connection ARNs, CodeBuild projects, IAM permissions, and project-specific npm scripts to work in a production account.
