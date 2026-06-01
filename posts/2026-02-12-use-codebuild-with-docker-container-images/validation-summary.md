# Validation Summary: How to Use CodeBuild with Docker for Building Container Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodeBuild
- Amazon Elastic Container Registry (ECR)
- AWS IAM
- AWS CLI
- Docker and Docker BuildKit
- Docker Buildx multi-platform builds
- Node.js Docker images
- npm

## Sources Consulted
- AWS CodeBuild User Guide: Publish Docker image to an Amazon ECR image repository sample - https://docs.aws.amazon.com/codebuild/latest/userguide/sample-docker.html
- AWS CodeBuild User Guide: EC2 compute images - https://docs.aws.amazon.com/codebuild/latest/userguide/ec2-compute-images.html
- AWS CodeBuild User Guide: Specify a local cache - https://docs.aws.amazon.com/codebuild/latest/userguide/specify-caching-local.html
- AWS CLI Command Reference: codebuild create-project - https://docs.aws.amazon.com/cli/latest/reference/codebuild/create-project.html
- AWS CodeBuild User Guide: Build specification reference - https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- Amazon ECR User Guide: Scan images for software vulnerabilities - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Amazon ECR User Guide: Retrieving findings for basic scans - https://docs.aws.amazon.com/AmazonECR/latest/userguide/describe-scan-findings.html
- Docker Docs: Inline cache - https://docs.docker.com/build/cache/backends/inline/
- Docker Docs: Multi-platform builds - https://docs.docker.com/build/building/multi-platform/
- Docker CLI reference: docker buildx build - https://docs.docker.com/reference/cli/docker/buildx/build/
- npm CLI docs: npm ci - https://docs.npmjs.com/cli/commands/npm-ci/

## Issues Found
- The CodeBuild project example used the older `aws/codebuild/amazonlinux2-x86_64-standard:5.0` image alias. AWS documentation now lists the updated `aws/codebuild/amazonlinux-x86_64-standard:5.0` alias, while noting the older alias remains valid. Updated the example to the current documented image identifier.
- The basic buildspec wrote `image_uri.txt` for "downstream stages" while the project example used `NO_ARTIFACTS`, and the artifact list included `appspec.yml` and `taskdef.json` without defining them in the tutorial. Updated the wording and artifact list so the snippet only references the generated `image_uri.txt`.
- The Dockerfile used `npm ci --only=production`. Current npm guidance uses `--omit=dev` to omit development dependencies. Updated the command.
- The BuildKit cache example tagged and pushed `$COMMIT_HASH` without setting it. Added the same `COMMIT_HASH` derivation used elsewhere in the post.
- The multi-architecture Buildx example assumed non-native architecture emulation was already available. Docker documentation says standalone Linux builders need QEMU/binfmt support for emulated non-native builds. Added the documented `tonistiigi/binfmt` setup command and made builder creation idempotent.
- The ECR image scanning example parsed AWS CLI output as JSON but did not force JSON output. Added `--output json` to keep the Python parsing reliable even if the CLI default output is configured differently.

## Review Notes
- The ECR scan-checking snippet is appropriate for the repository scan-on-push flow shown in the post. Teams using ECR enhanced scanning with Amazon Inspector may prefer gating from Inspector findings or EventBridge events instead of waiting inside CodeBuild.
- CodeBuild local Docker layer cache is correctly described, but AWS notes it is Linux-only, requires privileged mode, and has security implications.
