# Validation Summary: How to Set Up GitLab Runner on EC2

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2
- Amazon Linux 2023
- GitLab Runner
- GitLab CI/CD
- Docker executor
- Docker-in-Docker
- Docker socket binding
- Amazon S3 cache
- AWS CLI
- IAM policies
- Amazon CloudFront invalidations

## Sources Consulted
- GitLab Docs: Install GitLab Runner using the official GitLab repositories - https://docs.gitlab.com/runner/install/linux-repository.html
- GitLab Docs: Registering runners - https://docs.gitlab.com/runner/register/
- GitLab Docs: Migrating to the new runner registration workflow - https://docs.gitlab.com/ci/runners/new_creation_workflow/
- GitLab Docs: Docker executor - https://docs.gitlab.com/runner/executors/docker/
- GitLab Docs: Advanced GitLab Runner configuration - https://docs.gitlab.com/runner/configuration/advanced-configuration/
- GitLab Docs: Use Docker to build Docker images - https://docs.gitlab.com/ci/docker/using_docker_build/
- AWS Docs: Installing Docker on Amazon Linux 2023 - https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-docker.html
- AWS CLI Command Reference: put-bucket-lifecycle-configuration - https://docs.aws.amazon.com/cli/latest/reference/s3api/put-bucket-lifecycle-configuration.html
- Amazon CloudFront Developer Guide: Invalidate files - https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/Invalidation_Requests.html

## Issues Found
- The post referred to runner registration tokens and passed tag/locked/run-untagged attributes during registration. GitLab's current workflow uses runner authentication tokens, and those runner attributes are set when creating the runner in GitLab rather than passed to `gitlab-runner register` with a `glrt-` authentication token. Updated the terminology, instructions, and registration commands.
- The Docker verification command for the `gitlab-runner` user omitted `-H`, which GitLab documents for verifying Docker access as that user. Updated the command to `sudo -u gitlab-runner -H docker info`.
- The Docker image build examples used unpinned `docker:latest` images and pushed to a placeholder image name that would not work without a configured registry namespace. Updated the examples to use pinned Docker images and GitLab Container Registry variables with an explicit `docker login`.
- The Docker-in-Docker example was missing required runner-side `privileged = true` and `/certs/client` volume configuration for TLS-enabled DinD. Added the required config snippet and aligned the CI example with GitLab's documented TLS-enabled DinD pattern.
- The description and introduction mentioned autoscaling configurations, but the post did not include autoscaling setup. Updated those references to accurately describe the content covered.

## Review Notes
- The S3 cache configuration is valid for an EC2 runner using IAM instance profile credentials because GitLab Runner can use the AWS SDK default credential chain.
- Docker socket binding remains technically valid, but it gives jobs access to the host Docker daemon and has significant security implications; the post already distinguishes it from Docker-in-Docker.
- The `only: main` syntax in the sample pipeline is still supported, though `rules` is generally preferred for newer GitLab CI configurations.
