# Validation Summary: How to Add AWS ECR as a Registry in Portainer - A Practical Guide

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Portainer registry configuration
- Amazon Elastic Container Registry (ECR)
- AWS Identity and Access Management (IAM)
- AWS CLI
- Docker image pulls and registry authentication

## Sources Consulted
- Portainer Documentation: Add an AWS ECR registry — https://docs.portainer.io/admin/registries/add/ecr
- Portainer Documentation: Registries — https://docs.portainer.io/sts/admin/registries
- Amazon ECR User Guide: Private registry authentication in Amazon ECR — https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Amazon ECR User Guide: Pulling an image to your local environment from an Amazon ECR private repository — https://docs.aws.amazon.com/AmazonECR/latest/userguide/docker-pull-ecr-image.html
- Amazon ECR User Guide: Amazon Elastic Container Registry Identity-based policy examples — https://docs.aws.amazon.com/AmazonECR/latest/userguide/security_iam_id-based-policy-examples.html
- Amazon ECR User Guide: Private repository policies in Amazon ECR — https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policies.html
- AWS CLI Command Reference: `describe-repositories` — https://docs.aws.amazon.com/cli/latest/reference/ecr/describe-repositories.html
- Portainer source: ECR token refresh logic — https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/internal/registryutils/ecr_reg_token.go
- Portainer source: ECR client credential provider — https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/aws/ecr/ecr.go
- Portainer source: ECR registry creation validation — https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/api/http/handler/registries/registry_create.go
- Portainer source: ECR registry form fields — https://github.com/portainer/portainer/blob/d4114c510dbb4334ef5ebc847f3db58038ba6e65/app/portainer/components/forms/registry-form-aws-ecr/registry-form-ecr.html

## Issues Found
1. **The CE vs BE token-refresh guidance was incorrect.** The post claimed Portainer BE refreshes ECR tokens automatically while Portainer CE requires manual refresh or a cron workaround. Current Portainer source refreshes ECR authorization tokens automatically for ECR registries when needed, so I updated the explanation, stack example comment, troubleshooting text, and conclusion to remove the CE-specific manual-refresh advice.

2. **The cron-based `docker login` workaround was misleading for Portainer.** The original Step 6 suggested periodically refreshing host Docker credentials with `aws ecr get-login-password`. Portainer stores registry credentials itself and refreshes ECR auth tokens internally, so I replaced that step with the correct Portainer-specific behavior.

3. **The IAM role / instance metadata guidance for Portainer was unsupported.** The post said Portainer could use EC2 instance metadata if the ECR access key fields were left empty. Current Portainer ECR code uses a static AWS credential provider for the configured registry, and Portainer's ECR form requires Access Key, Secret Access Key, and Region when authentication is enabled. I rewrote that section to clarify that IAM roles are valid for native EC2/ECS/EKS pulls outside Portainer, but not as a substitute for Portainer's private ECR registry form.

4. **The Portainer form example omitted required fields.** The original configuration block did not include the required `Name` or `Registry URL` fields. I added both so the example matches Portainer's actual ECR registry form.

5. **Cross-account ECR access was incomplete.** The original text implied that using the target account's registry URL was enough. AWS also requires the IAM principal to be granted access through an ECR repository policy or an identity-based IAM policy, so I added that clarification.

## Review Notes
- The custom IAM policy shown in the post is acceptable for a pull-focused workflow, but Portainer's own ECR documentation recommends `AmazonEC2ContainerRegistryFullAccess` when you want full registry management functionality inside Portainer.
- The post is accurate for private Amazon ECR registries. Portainer source also supports unauthenticated public ECR registries, but that is outside the scope of this article.
