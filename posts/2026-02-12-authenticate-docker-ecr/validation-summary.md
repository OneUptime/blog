# Validation Summary: How to Authenticate Docker with ECR

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon ECR
- AWS CLI
- Docker CLI
- Amazon ECR Docker Credential Helper
- IAM policies and roles
- Amazon ECS task execution roles
- GitHub Actions OIDC

## Sources Consulted
- AWS CLI Command Reference: `aws ecr get-login-password` - https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR User Guide: Private registry authentication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Amazon ECR Docker Credential Helper README - https://github.com/awslabs/amazon-ecr-credential-helper
- Docker CLI Reference: `docker login` - https://docs.docker.com/reference/cli/docker/login/
- Docker CLI configuration reference - https://docs.docker.com/reference/cli/docker/
- Amazon ECS Developer Guide: Task execution IAM role - https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- Amazon ECR User Guide: IAM permissions for pushing an image - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html
- AWS GitHub Action: `aws-actions/amazon-ecr-login` - https://github.com/aws-actions/amazon-ecr-login
- AWS Lambda Developer Guide: Container images - https://docs.aws.amazon.com/lambda/latest/dg/lambda-images.html

## Issues Found
- Several ECR registry URIs and IAM ARNs used the placeholder account ID `123456789`, which is not a valid 12-digit AWS account ID. Updated those examples to `123456789012` so the registry URLs and ARNs match AWS formats.
- The IAM role section listed Lambda alongside environments where users run Docker and the AWS CLI with attached runtime credentials. Lambda container image retrieval is managed by the Lambda service and repository permissions, not by running `docker login` inside Lambda. Adjusted the wording to EC2, CodeBuild, and similar Docker-capable AWS environments.

## Review Notes
The documented AWS CLI authentication command, `--username AWS`, `--password-stdin`, 12-hour ECR token lifetime, credential helper configuration, AWS profile usage, ECS execution-role pull permissions, GitHub Actions ECR login action, and push/pull IAM actions were verified against official documentation and are technically correct.
