# Validation Summary: How to Fix ECR 'no basic auth credentials' Docker Push Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Amazon Elastic Container Registry (ECR)
- AWS CLI
- Docker CLI
- Docker credential stores and credential helpers
- Amazon ECR Docker Credential Helper
- GitHub Actions
- Jenkins Pipeline
- AWS IAM policies
- ECR repository policies

## Sources Consulted
- Amazon ECR private registry authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Amazon ECR Docker image push guide: https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-push-ecr-image.html
- Amazon ECR IAM permissions for pushing images: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html
- Docker CLI `docker login` reference: https://docs.docker.com/reference/cli/docker/login/
- Docker CLI `docker tag` reference: https://docs.docker.com/engine/reference/commandline/tag/
- Amazon ECR Docker Credential Helper README: https://github.com/awslabs/amazon-ecr-credential-helper
- Homebrew formula for docker-credential-helper-ecr: https://formulae.brew.sh/formula/docker-credential-helper-ecr
- AWS GitHub Action `amazon-ecr-login`: https://github.com/aws-actions/amazon-ecr-login
- AWS CLI `get-repository-policy` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-repository-policy.html

## Issues Found
- The post said Docker stores ECR tokens in `~/.docker/config.json`. Docker may instead store credentials in a configured credential store, especially with Docker Desktop. Updated the explanation to mention the configured credential store and `config.json` fallback.
- The wrong-registry-url examples omitted `--region`, while using an explicit regional ECR registry URL. Added `--region us-east-1` to keep the AWS CLI token request aligned with the registry URL.
- The ECR credential helper install commands grouped Amazon Linux and RHEL under `yum`. Official helper installation distinguishes Amazon Linux 2023 (`dnf`) and Amazon Linux 2 (`amazon-linux-extras` plus `yum`). Updated the commands and clarified the Debian/Ubuntu package availability baseline.
- The push IAM policy included `ecr:GetDownloadUrlForLayer`, which is required for pulling but not listed in AWS's push-only policy. Removed it from the push permissions example.

## Review Notes
The GitHub Actions example matches the current `aws-actions/amazon-ecr-login@v2` documented pattern. The credential helper `credHelpers` configuration is valid for Docker 1.13.0+ and matches the helper's documented registry-specific configuration style. The Jenkins example is syntactically reasonable but assumes the Jenkins agent already has Docker, AWS CLI, and AWS credentials configured.
