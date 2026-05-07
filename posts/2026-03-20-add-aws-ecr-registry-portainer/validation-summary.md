# Validation Summary: How to Add AWS ECR as a Registry in Portainer

## Status
validated

## Post Type
Guide

## Technologies Covered
- Portainer
- Amazon Elastic Container Registry (ECR)
- AWS CLI
- Docker
- AWS Identity and Access Management (IAM)

## Sources Consulted
- Portainer documentation: Add an AWS ECR registry — https://docs.portainer.io/admin/registries/add/ecr
- Portainer documentation: Registries overview — https://docs.portainer.io/admin/registries
- AWS CLI reference: `aws ecr get-login-password` — https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR user guide: Private registry authentication — https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- Portainer source: registry creation handler — https://github.com/portainer/portainer/blob/develop/api/http/handler/registries/registry_create.go
- Portainer source: registry update handler — https://github.com/portainer/portainer/blob/develop/api/http/handler/registries/registry_update.go
- Portainer source: ECR token refresh logic — https://github.com/portainer/portainer/blob/develop/api/internal/registryutils/ecr_reg_token.go
- Portainer source: registry provider options — https://github.com/portainer/portainer/blob/develop/app/react/portainer/registries/CreateView/options.tsx

## Issues Found
- The post claimed native AWS ECR support was limited to Portainer Business Edition and that a Community Edition workaround was required. I corrected this to reflect current Portainer behavior: AWS ECR is a native registry type and Portainer refreshes ECR authorization tokens automatically.
- The Portainer UI path and form details were inaccurate. I changed `Settings > Registries` to `Registries`, aligned the provider name to `AWS ECR`, and added the missing `Name` and `Authentication` fields from the official docs.
- The manual Portainer API script was technically incorrect and unnecessary. Its JSON body did not match Portainer's current registry update schema, and the post no longer needs a manual token-rotation workflow because Portainer handles ECR token refresh natively.
- The IAM policy section was too broad in implication. I clarified that the sample permissions are for pull-only access.

## Review Notes
- Portainer's official ECR documentation recommends the `AmazonEC2ContainerRegistryFullAccess` policy for full registry management inside Portainer. The policy shown in the post is sufficient for pull-only access.
- Portainer's official ECR documentation also notes that IAM users with MFA enabled are not currently supported for this integration.
