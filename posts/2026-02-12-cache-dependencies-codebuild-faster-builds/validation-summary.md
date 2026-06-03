# Validation Summary: How to Cache Dependencies in CodeBuild for Faster Builds

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS CodeBuild
- AWS CLI
- Amazon S3 caching
- CodeBuild local caching
- Docker and BuildKit
- Amazon ECR
- npm and Yarn
- Maven and Gradle
- Python, Go, Ruby, and Rust dependency caches
- CloudWatch build duration monitoring

## Sources Consulted
- AWS CodeBuild User Guide: Cache builds to improve performance: https://docs.aws.amazon.com/codebuild/latest/userguide/build-caching.html
- AWS CodeBuild User Guide: Amazon S3 caching: https://docs.aws.amazon.com/codebuild/latest/userguide/caching-s3.html
- AWS CodeBuild User Guide: Specify a local cache: https://docs.aws.amazon.com/codebuild/latest/userguide/specify-caching-local.html
- AWS CodeBuild User Guide: Build specification reference: https://docs.aws.amazon.com/codebuild/latest/userguide/build-spec-ref.html
- AWS CLI Command Reference: codebuild update-project: https://docs.aws.amazon.com/cli/latest/reference/codebuild/update-project.html
- AWS CodeBuild troubleshooting documentation for S3 cache permissions: https://docs.aws.amazon.com/codebuild/latest/userguide/troubleshooting.html
- npm CLI documentation: npm ci: https://docs.npmjs.com/cli/commands/npm-ci/
- npm CLI documentation: npm config / prefer-offline: https://docs.npmjs.com/cli/using-npm/config/
- Docker documentation: Docker build cache and BuildKit inline cache: https://docs.docker.com/build/cache/ and https://docs.docker.com/build/cache/backends/inline/
- Docker CLI reference: docker build / --cache-from: https://docs.docker.com/reference/cli/docker/image/build/

## Issues Found
- The post recommended caching `node_modules` while using `npm ci` and said `npm ci` is faster when `node_modules` exists and matches the lockfile. This is incorrect because npm documents that `npm ci` removes an existing `node_modules` directory before installing. I changed the npm examples and troubleshooting guidance to cache `/root/.npm/**/*` instead, and clarified that this is npm's package cache.
- The local Docker layer cache section did not mention the required CodeBuild environment setting. AWS documents that `LOCAL_DOCKER_LAYER_CACHE` is available only for Linux environments and requires privileged mode. I added this caveat near the local cache modes and again where Docker layer caching is combined with remote image cache sources.

## Review Notes
- The AWS CLI `update-project --cache` JSON shapes, CodeBuild buildspec `cache.paths` syntax, S3 cache location format, local cache mode names, Maven/Gradle cache paths, S3 cache permission guidance, and Docker `--cache-from`/inline cache usage were consistent with official documentation.
- The examples assume the CodeBuild image runs as root, which is the default when `run-as` is not set in the buildspec. Projects that configure a different build user should adjust cache paths accordingly.
