# Validation Summary: How to Use CodePipeline with ECS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CodePipeline
- AWS CodeBuild
- AWS CodeDeploy
- Amazon ECS
- Amazon ECR
- Docker
- Node.js
- YAML
- JSON
- AWS CLI

## Sources Consulted
- AWS CodePipeline ECS blue/green deploy action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-ECSbluegreen.html
- AWS CodePipeline image definitions file reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/file-reference.html
- AWS CodePipeline CodeStarSourceConnection action reference: https://docs.aws.amazon.com/codepipeline/latest/userguide/action-reference-CodestarConnectionSource.html
- AWS CodePipeline create pipeline guide: https://docs.aws.amazon.com/codepipeline/latest/userguide/pipelines-create.html
- AWS CodeBuild buildspec reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CodeBuild EC2 compute images: https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html
- AWS CLI CodeBuild create-project command reference: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/codebuild/create-project.html
- Dockerfile reference for HEALTHCHECK: https://docs.docker.com/reference/dockerfile/
- Node.js End-of-Life information: https://nodejs.org/en/about/eol

## Issues Found
- The Dockerfile used `node:18-alpine`, but Node.js 18 is end-of-life as of 2026. Updated the base image to `node:24-alpine`, matching the current LTS line shown by Node.js.
- The Dockerfile health check used `curl`, but Alpine-based Node images do not guarantee `curl` is installed. Added `RUN apk add --no-cache curl` so the health check command can run.
- Updated `npm ci --production` to `npm ci --omit=dev`, which is the current npm form for installing production dependencies only.

## Review Notes
- The `CodeDeployToECS` deploy action, `imageDetail.json` format, `<IMAGE1_NAME>` task definition placeholder, and `<TASK_DEFINITION>` AppSpec placeholder match the AWS CodePipeline ECS blue/green deployment documentation.
- The CodeBuild project uses the older `amazonlinux2` image alias. AWS documentation notes that Linux standard image aliases were updated from `amazonlinux2` to `amazonlinux`, but no manual update is required because previous aliases remain valid.
