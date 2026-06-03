# Validation Summary: How to Deploy Lambda Functions as Container Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Lambda container images
- Amazon ECR
- Docker and Docker Buildx
- Node.js Lambda base images
- Python Lambda base images
- AWS Lambda Runtime Interface Client (RIC)
- AWS Lambda Runtime Interface Emulator (RIE)
- AWS CDK
- API Gateway
- GitHub Actions

## Sources Consulted
- AWS Lambda: Create a Lambda function using a container image: https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- AWS Lambda: Deploy Node.js Lambda functions with container images: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-image.html
- AWS Lambda: Deploy Python Lambda functions with container images: https://docs.aws.amazon.com/lambda/latest/dg/python-image.html
- AWS Lambda quotas: https://docs.aws.amazon.com/lambda/latest/dg/gettingstarted-limits.html
- AWS CLI `update-function-code` reference: https://docs.aws.amazon.com/cli/latest/reference/lambda/update-function-code.html
- AWS CDK `DockerImageCode` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.DockerImageCode.html
- AWS CDK `DockerImageFunction` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.DockerImageFunction.html
- AWS CDK `Alias` API reference: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_lambda.Alias.html
- Docker Buildx build reference: https://docs.docker.com/reference/cli/docker/buildx/build/
- GitHub Action `aws-actions/amazon-ecr-login`: https://github.com/aws-actions/amazon-ecr-login

## Issues Found
- The Node.js example used `public.ecr.aws/lambda/nodejs:20`, but current AWS Lambda Node.js container image documentation lists Node.js 22 and 24 as current base images. Updated the example to `public.ecr.aws/lambda/nodejs:22`.
- The custom base image example used `ubuntu:22.04` and attempted to install `python3.12` from the default Ubuntu repositories, which would not work without adding an external package source. Replaced it with `python:3.12-slim`, matching AWS's documented alternative-base-image pattern for Python.
- The custom image description said any Docker image could be used with a RIC. Clarified that Lambda container images must be compatible Linux images built for one supported architecture.
- The Docker build examples used plain `docker build`. AWS's current Lambda container image guides specify `docker buildx build --platform ... --provenance=false` for Lambda-compatible images. Updated the local and CI build commands accordingly.
- The cold start explanation implied every cold start is longer because Lambda pulls and extracts the image from ECR. AWS documents an image optimization lifecycle instead. Updated the text to describe image optimization after upload and re-optimization after inactive reclamation.
- The cold start optimization list recommended putting frequently accessed layers early in the Dockerfile. Reworded this to focus on dependency layers before frequently changed app code for build cache reuse and reduced image churn.
- The ZIP comparison said functions and dependencies should be under 250 MB. Clarified that this is the unzipped deployment package limit.

## Review Notes
The CDK examples use current `DockerImageFunction`, `DockerImageCode.fromImageAsset`, `ephemeralStorageSize`, and `Alias.provisionedConcurrentExecutions` APIs. The GitHub Actions workflow uses current action versions, though production deployments should generally prefer GitHub OIDC role assumption over long-lived AWS access keys.
