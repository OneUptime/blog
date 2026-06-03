# Validation Summary: How to Use CDK with Docker Assets

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CDK v2
- AWS ECS and Fargate
- AWS Lambda container images
- Amazon ECR
- Docker and Docker BuildKit
- TypeScript

## Sources Consulted
- AWS CDK v2 Developer Guide, "Build and deploy container image assets in CDK apps": https://docs.aws.amazon.com/cdk/v2/guide/build-containers.html
- AWS CDK v2 Developer Guide, "Assets and the AWS CDK": https://docs.aws.amazon.com/cdk/v2/guide/assets.html
- AWS CDK v2 API Reference, `DockerImageAssetOptions`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecr_assets.DockerImageAssetOptions.html
- AWS CDK v2 API Reference, `DockerImageFunction`: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.DockerImageFunction.html
- AWS CDK v2 API Reference, ECS module image options and port mappings: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ecs-readme.html
- AWS Lambda Developer Guide, "Deploy Python Lambda functions with container images": https://docs.aws.amazon.com/lambda/latest/dg/python-image.html
- Docker CLI reference, `docker image build`: https://docs.docker.com/reference/cli/docker/image/build/
- Docker Build documentation, build variables: https://docs.docker.com/build/building/variables/

## Issues Found
- The deployment flow said Docker images are pushed to an ECR repository "in your CDK bootstrap bucket." CDK bootstrap creates both an S3 bucket and an ECR repository for assets; Docker image assets are pushed to the ECR repository, not the bucket. Updated the wording accordingly.
- The deployment flow implied CDK simply skips the build when the asset hash matches a previous image. Updated this to explain that CDK uses the asset hash to identify publishing needs, while Docker's own build cache handles unchanged image layers during local builds.
- The custom build example used `ecr_assets.Platform.LINUX_AMD64` without importing `aws-cdk-lib/aws-ecr-assets`. Added the missing import.
- The Lambda example used `cdk.Duration.seconds(30)` without importing `aws-cdk-lib`. Added the missing import.
- The Lambda Dockerfile explanation said Lambda container images need to use an AWS Lambda base image. AWS also supports non-AWS base images when the image includes the Lambda runtime interface client. Updated the text to describe the AWS base image as the easiest path rather than the only valid path.
- The BuildKit example set `DOCKER_BUILDKIT` inside `buildArgs`, but Docker documents this as a client/build-tool environment variable, not a Docker build argument. Replaced the TypeScript snippet with `DOCKER_BUILDKIT=1 cdk deploy` and noted that modern Docker builds use BuildKit by default.
- The caching section said any file change causes the entire image to rebuild. Updated it to distinguish CDK asset fingerprinting from Docker layer cache reuse.

## Review Notes
- The post is technically relevant and contains implementation guidance with code examples.
- The final internal OneUptime links were checked with HTTP HEAD requests and returned 200 responses.
- The example build argument `BUILD_DATE: new Date().toISOString()` is syntactically valid, but using dynamic build args can intentionally change the asset hash on every synth/deploy. This may be worth avoiding in production examples unless that behavior is desired.
