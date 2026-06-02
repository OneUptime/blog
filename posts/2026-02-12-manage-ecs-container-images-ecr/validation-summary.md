# Validation Summary: How to Manage ECS Container Images in ECR

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Amazon Elastic Container Registry (ECR)
- Amazon Elastic Container Service (ECS)
- AWS CLI
- Docker and Docker Buildx
- Terraform AWS provider
- AWS IAM roles and managed policies

## Sources Consulted
- AWS CLI Command Reference: `ecr create-repository` - https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ecr/create-repository.html
- AWS CLI Command Reference: `ecr put-registry-scanning-configuration` - https://docs.aws.amazon.com/cli/latest/reference/ecr/put-registry-scanning-configuration.html
- AWS CLI Command Reference: `ecr put-image` - https://docs.aws.amazon.com/cli/latest/reference/ecr/put-image.html
- AWS CLI Command Reference: `ecr batch-delete-image` - https://docs.aws.amazon.com/cli/latest/reference/ecr/batch-delete-image.html
- Amazon ECR User Guide: image tag mutability - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-tag-mutability.html
- Amazon ECR User Guide: lifecycle policy properties - https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR User Guide: image scanning - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Amazon ECR User Guide: using Amazon ECR images with Amazon ECS - https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_ECS.html
- Amazon ECS Developer Guide: task execution IAM role - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Amazon ECS documentation/news: software version consistency for ECS services - https://aws.amazon.com/about-aws/whats-new/2024/07/amazon-ecs-software-version-consistency-containerized-applications/
- Terraform Registry: `aws_ecr_repository` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository.html
- Terraform Registry: `aws_ecr_registry_scanning_configuration` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_scanning_configuration
- Docker Docs: `docker buildx build` - https://docs.docker.com/reference/cli/docker/buildx/build/

## Issues Found
- The ECR registry URI examples used a 9-digit account ID (`123456789`), but AWS account IDs and ECR registry IDs are 12 digits. Updated all affected ECR URIs and the KMS ARN example to use `123456789012`.
- The repository creation examples used the repository-level `--image-scanning-configuration scanOnPush=true` option. AWS CLI documentation marks this parameter as deprecated in favor of registry-level scanning configuration. Replaced it with `aws ecr put-registry-scanning-configuration` and updated Terraform examples to use `aws_ecr_registry_scanning_configuration`.
- The recommended multi-tag example pushed a moving `latest` tag while the post also recommended immutable ECR tags. Removed the `latest` push from the immutable production tagging example.
- The environment tag example could conflict with immutable tag settings if the tag is moved between releases. Added a caveat that environment tags should only be used where moving tags are allowed, such as mutable repositories or tag mutability exclusions.
- The ECS integration text stated that ECS uses the execution role for ECR pulls in the same account and region. AWS documents different roles by launch type: Fargate uses the task execution role, while ECS on EC2 uses the container instance role for ECR pull permissions. Updated the wording.
- The `latest` tag risk list included an outdated mid-deployment inconsistency claim for modern ECS services. Updated it to reflect ECS software version consistency, where ECS resolves tags to digests for services but still requires a new deployment to pick up a changed mutable tag.

## Review Notes
The remaining examples are accurate as concise snippets. For production deployments, using image digests instead of tags would provide even stronger immutability, but the post's recommendation to use Git SHA or version tags is technically valid.
