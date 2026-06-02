# Validation Summary: How to Push Docker Images to ECR from CI/CD

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Amazon ECR
- AWS IAM and OIDC federation
- AWS CLI
- Docker and Docker Buildx
- GitHub Actions
- GitLab CI
- Jenkins Pipeline
- AWS CodeBuild
- Terraform AWS provider resources

## Sources Consulted
- Amazon ECR User Guide: pushing images and `get-login-password` authentication: https://docs.aws.amazon.com/AmazonECR/latest/userguide/getting-started-cli.html
- Amazon ECR User Guide: IAM permissions for pushing images: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html
- GitHub Docs: configuring OpenID Connect in Amazon Web Services: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- AWS Actions `amazon-ecr-login` documentation: https://github.com/aws-actions/amazon-ecr-login
- Docker Docs: GitHub Actions cache backend for Buildx: https://docs.docker.com/build/cache/backends/gha/
- GitLab Docs: Docker-in-Docker CI configuration: https://docs.gitlab.com/ci/docker/using_docker_build/
- Jenkins Pipeline AWS Steps plugin documentation: https://plugins.jenkins.io/pipeline-aws/
- AWS CodeBuild User Guide: Docker image build and ECR push sample: https://docs.aws.amazon.com/codebuild/latest/userguide/sample-docker.html
- AWS CodeBuild User Guide: privileged mode requirement for Docker builds: https://docs.aws.amazon.com/codebuild/latest/userguide/create-project.html
- Terraform AWS provider documentation for `aws_iam_openid_connect_provider`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider

## Issues Found
- The examples used `123456789` as an AWS account ID. AWS account IDs are 12 digits, and official ECR examples use 12-digit registry IDs. Updated placeholders to `123456789012`.
- The GitHub OIDC Terraform example pinned a GitHub TLS thumbprint. Current AWS IAM behavior validates common OIDC providers such as GitHub through trusted root CAs, and the Terraform AWS provider supports omitting `thumbprint_list`. Removed the stale thumbprint pin.
- The GitLab CI and Jenkins examples authenticated Docker against an ECR repository URI that included the repository path. Official ECR guidance logs Docker into the registry host only. Added `ECR_REGISTRY` and changed Docker login commands to use the registry host.
- The GitLab Docker-in-Docker example was missing Docker daemon connection variables and used broad Docker tags. Added `DOCKER_HOST`, disabled DinD TLS for that example, and pinned the Docker CLI and DinD images to the version used in current GitLab documentation.
- A GitLab comment said the workflow tagged images with a branch name, but the code only tags `latest` on `main`. Updated the comment to match the code.
- The CodeBuild section omitted the privileged-mode requirement for Docker image builds. Added a sentence noting that the build project must enable privileged mode.
- The Docker Buildx examples used `docker/build-push-action@v5`; current Docker documentation shows `@v7`. Updated those examples to `@v7`.

## Review Notes
The remaining snippets align with official examples and permission requirements. The GitLab example assumes a runner configured to allow Docker-in-Docker in privileged mode, which is required for the shown service-based Docker build approach.
