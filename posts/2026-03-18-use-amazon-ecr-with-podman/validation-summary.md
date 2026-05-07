# Validation Summary: How to Use Amazon ECR with Podman

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Elastic Container Registry (ECR)
- Amazon ECR Public
- AWS CLI
- Podman
- Amazon ECR Docker Credential Helper
- ECR lifecycle policies
- Container image build, tag, pull, and push workflows

## Sources Consulted
- AWS ECR User Guide: Using Podman with Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/Podman.html
- AWS ECR User Guide: Private registry authentication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI Command Reference: ecr create-repository - https://docs.aws.amazon.com/cli/latest/reference/ecr/create-repository.html
- AWS CLI Command Reference: ecr put-registry-scanning-configuration - https://docs.aws.amazon.com/cli/latest/reference/ecr/put-registry-scanning-configuration.html
- AWS ECR User Guide: Configuring basic scanning for images - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-basic-enabling.html
- AWS ECR User Guide: Lifecycle policy properties - https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- AWS ECR Public User Guide: Moving an image through its lifecycle in Amazon ECR Public - https://docs.aws.amazon.com/AmazonECR/latest/public/getting-started-cli.html
- AWS ECR Public User Guide: Pulling an image from the Amazon ECR Public Gallery - https://docs.aws.amazon.com/AmazonECR/latest/public/docker-pull-ecr-image.html
- Podman documentation: podman-login - https://docs.podman.io/en/v5.6.0/markdown/podman-login.1.html
- Amazon ECR Docker Credential Helper repository - https://github.com/awslabs/amazon-ecr-credential-helper

## Issues Found
- The original repository creation section used `aws ecr create-repository --image-scanning-configuration scanOnPush=true`. The AWS CLI still accepts this option, but AWS marks repository-level image scanning configuration as deprecated in favor of registry-level scanning configuration. I replaced that example with `aws ecr put-registry-scanning-configuration --scan-type BASIC --rules ...` for scan-on-push configuration scoped to the `myapp` repository filter.

## Review Notes
- The ECR authentication examples are correct: `aws ecr get-login-password` piped to `podman login --username AWS --password-stdin` matches AWS documentation, and private ECR authorization tokens are valid for 12 hours.
- The Podman credential helper example is consistent with AWS guidance that Podman supports `credHelpers` but not `credsStore` for the ECR helper.
- The lifecycle policy example is syntactically valid. Because it uses `tagStatus: "any"` as the only rule, its `rulePriority` value is valid.
- The CI/CD snippet assumes a CI environment that sets `CI_COMMIT_SHA`; this is reasonable for the example, but a future revision could note that other CI systems may use a different commit SHA variable.
