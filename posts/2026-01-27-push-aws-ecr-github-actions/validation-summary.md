# Validation Summary: How to Push to AWS ECR with GitHub Actions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- GitHub Actions
- Amazon Elastic Container Registry (ECR)
- AWS IAM and OIDC federation
- AWS CLI
- Docker and Docker Buildx
- Docker GitHub Actions
- ECR image scanning and lifecycle policies

## Sources Consulted
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/actions/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- aws-actions/configure-aws-credentials official README - https://github.com/aws-actions/configure-aws-credentials
- aws-actions/amazon-ecr-login official README - https://github.com/aws-actions/amazon-ecr-login
- Amazon ECR User Guide: IAM permissions for pushing an image - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html
- Amazon ECR User Guide: Private repository policy examples - https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html
- AWS CLI Command Reference: ecr create-repository - https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html
- AWS CLI Command Reference: ecr put-registry-scanning-configuration - https://docs.aws.amazon.com/cli/latest/reference/ecr/put-registry-scanning-configuration.html
- AWS CLI Command Reference: ecr image-scan-complete waiter - https://docs.aws.amazon.com/cli/latest/reference/ecr/wait/image-scan-complete.html
- AWS CLI Command Reference: ecr describe-image-scan-findings - https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-image-scan-findings.html
- Amazon ECR User Guide: Lifecycle policy properties - https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Docker Docs: GitHub Actions cache backend - https://docs.docker.com/build/cache/backends/gha/
- Docker Docs: Multi-platform image with GitHub Actions - https://docs.docker.com/build/ci/github-actions/multi-platform/
- Docker Docs: Manage tags and labels with GitHub Actions - https://docs.docker.com/build/ci/github-actions/manage-tags-labels/
- docker/build-push-action official README - https://github.com/docker/build-push-action

## Issues Found
- The repository creation snippet used `--image-scanning-configuration scanOnPush=true`, which AWS CLI documentation now marks as deprecated in favor of registry-level scanning configuration. I removed the deprecated repository-level flag and added `aws ecr put-registry-scanning-configuration` with a `BASIC` scan-on-push rule for the example repository.
- The multi-region workflow used OIDC credentials without declaring `id-token: write` permissions in the `build` and `replicate` jobs. I added the required permissions blocks so `aws-actions/configure-aws-credentials` can request an OIDC token.
- The multi-region replication job logged in only to the target ECR registry, then attempted to pull from the primary `us-east-1` registry. Docker registry login state does not carry over from the separate build job, and ECR private registries require authentication. I changed the example to log in to both the primary and target ECR registries before pulling and pushing.

## Review Notes
- The remaining examples use valid GitHub Actions workflow syntax and current documented action inputs for AWS credential configuration, ECR login, Docker metadata, Docker Buildx builds, GitHub Actions cache, and multi-platform image pushes.
- The vulnerability scanning example assumes scan-on-push or another scan trigger is already configured for the repository or registry.
- For production workflows, pinning third-party actions to commit SHAs instead of major-version tags would further reduce supply-chain risk, but the major-version tags shown are common and technically valid.
