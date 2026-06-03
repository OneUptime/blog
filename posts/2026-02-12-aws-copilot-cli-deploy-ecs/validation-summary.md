# Validation Summary: How to Use AWS Copilot CLI to Deploy ECS Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Copilot CLI
- Amazon ECS
- AWS Fargate
- AWS App Runner
- Amazon ECR
- AWS CloudFormation
- AWS Systems Manager Parameter Store
- Amazon DynamoDB
- Amazon S3
- Amazon Aurora
- AWS CodePipeline and CodeBuild
- ECS Service Connect / Service Discovery

## Sources Consulted
- AWS Copilot CLI end-of-support announcement: https://aws.amazon.com/blogs/containers/announcing-the-end-of-support-for-the-aws-copilot-cli/
- AWS ECS Developer Guide, Installing the AWS Copilot CLI: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/copilot-install.html
- AWS Copilot CLI app init command: https://aws.github.io/copilot-cli/docs/commands/app-init/
- AWS Copilot CLI svc init command: https://aws.github.io/copilot-cli/docs/commands/svc-init/
- AWS Copilot CLI env init command: https://aws.github.io/copilot-cli/docs/commands/env-init/
- AWS Copilot CLI svc deploy command: https://aws.github.io/copilot-cli/docs/commands/svc-deploy/
- AWS Copilot CLI Load Balanced Web Service manifest: https://aws.github.io/copilot-cli/docs/manifest/lb-web-service/
- AWS Copilot CLI Backend Service manifest: https://aws.github.io/copilot-cli/docs/manifest/backend-service/
- AWS Copilot CLI service-to-service communication: https://aws.github.io/copilot-cli/docs/developing/svc-to-svc-communication/
- AWS Copilot CLI secret init command: https://aws.github.io/copilot-cli/docs/commands/secret-init/
- AWS Copilot CLI storage init command: https://aws.github.io/copilot-cli/docs/commands/storage-init/
- AWS Copilot CLI pipeline init command: https://aws.github.io/copilot-cli/docs/commands/pipeline-init/
- AWS Copilot CLI pipeline manifest: https://aws.github.io/copilot-cli/docs/manifest/pipeline/

## Issues Found
- AWS Copilot CLI now has an official end-of-support date of June 12, 2026. Updated the introduction so readers know it is no longer a strong default choice for new projects and should be compared with Amazon ECS Express Mode or AWS CDK.
- The Copilot-vs-Terraform section still recommended Copilot for starting new projects. Updated it to frame Copilot as useful for existing Copilot applications and to mention migration after the end-of-support date.
- The direct-download install command was labeled "macOS/Linux" while downloading the Linux x86 64-bit binary. Changed the label to "Linux x86 64-bit" so macOS users are not directed to the wrong binary.
- The service type list omitted the current Static Site service type supported by `copilot svc init`. Added it to the list.
- The backend service manifest used a raw CloudFormation `!GetAtt` expression inside the Copilot manifest `variables` section. Replaced it with a plain environment variable because Copilot manifests are not general CloudFormation templates; addon output values should be exposed through addon outputs or generated storage variables.
- The `copilot storage init` examples omitted the required `--lifecycle` flag. Added `--lifecycle workload` to the DynamoDB, S3, and Aurora examples.
- The `copilot pipeline init` example used `--branch`, but the current documented flag is `--git-branch`. Updated the command.
- The pipeline manifest path was shown as `copilot/pipeline.yml`. Current Copilot creates pipeline files under `copilot/pipelines/[pipeline name]/`, so the text and snippet comment now use `copilot/pipelines/main-pipeline/manifest.yml`.

## Review Notes
The core deployment flow, manifest structure, environment creation examples, service deployment commands, secret path interpolation, service discovery explanation, operational commands, and pipeline manifest fields were otherwise consistent with current AWS Copilot documentation. The local environment did not have the `copilot` binary installed, so command validation was performed against official AWS documentation rather than local `--help` output.
