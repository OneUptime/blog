# Validation Summary: How to Use ECR Pull-Through Cache for Public Images

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon ECR pull-through cache
- AWS CLI
- AWS Secrets Manager
- AWS IAM
- Amazon ECS task definitions
- Terraform AWS provider
- Docker Hub, Amazon ECR Public, Quay.io, and GitHub Container Registry
- Dockerfiles
- Python boto3 Lambda automation

## Sources Consulted
- Amazon ECR User Guide: Sync an upstream registry with an Amazon ECR private registry - https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache.html
- Amazon ECR User Guide: Creating a pull through cache rule in Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-creating-rule.html
- Amazon ECR User Guide: Pulling an image with a pull through cache rule in Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-working-pulling.html
- Amazon ECR User Guide: Storing your upstream repository credentials in an AWS Secrets Manager secret - https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-creating-secret.html
- Amazon ECR User Guide: IAM permissions required to sync an upstream registry with an Amazon ECR private registry - https://docs.aws.amazon.com/AmazonECR/latest/userguide/pull-through-cache-iam.html
- Amazon ECR User Guide: Templates to control repositories created during a pull through cache, create on push, or replication action - https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-creation-templates.html
- Amazon ECR User Guide: Creating a lifecycle policy for a repository in Amazon ECR - https://docs.aws.amazon.com/AmazonECR/latest/userguide/lp_creation.html
- Docker Docs: Docker Hub pull usage and limits - https://docs.docker.com/docker-hub/usage/storage/
- Terraform Registry: aws_ecr_pull_through_cache_rule - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_pull_through_cache_rule

## Issues Found
- Docker Hub official image paths were shown as `docker-hub/nginx` and `docker-hub/redis`. AWS documentation says Docker Hub official images must include the `/library` prefix when pulled through ECR. Updated examples to use `docker-hub/library/nginx`, `docker-hub/library/redis`, and `docker-hub/library/node`.
- The post said ECR does not automatically update cached tags. AWS documentation says ECR checks the upstream registry for a newer tag version at least once every 24 hours when the cached tag is pulled, unless tag immutability prevents overwrites. Updated the cache behavior section accordingly.
- The cache invalidation wording implied deletion is always required to get mutable tag updates. Updated it to clarify deletion is only needed to force an immediate refresh before ECR's next upstream check.
- The setup examples included Docker Hub and GitHub Container Registry as unauthenticated pull-through cache rules. AWS currently documents Docker Hub and GitHub Container Registry as upstream registries that require Secrets Manager credentials. Removed those unauthenticated CLI examples and clarified that credentials are required.
- The Terraform setup snippet referenced `aws_secretsmanager_secret.docker_hub_credentials`, while the post later defines `aws_secretsmanager_secret.docker_hub`. Updated the reference for consistency.
- The lifecycle policy guidance only mentioned a script or Lambda for newly auto-created repositories. AWS now documents repository creation templates as the built-in mechanism for applying lifecycle policies to repositories created by pull-through cache. Updated the guidance while keeping the Lambda option.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI flag validation was performed against official AWS documentation rather than local `aws --help` output. The pricing statement is broadly consistent with AWS's current ECR private repository pricing example, but regional pricing and free tier details may vary and should be revisited if the post is expanded.
