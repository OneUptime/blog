# Validation Summary: How to Configure Container Registry Authentication with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- AWS ECR (Elastic Container Registry)
- Azure Container Registry (ACR)
- GCP Artifact Registry
- Kubernetes (imagePullSecrets, Secrets API)
- AWS IAM (cross-account repository policies)
- Azure RBAC (AcrPull, AcrPush built-in roles)
- GCP IAM
- IRSA (IAM Roles for Service Accounts), Workload Identity, AKS Managed Identity

## Sources Consulted
- AWS provider docs for `aws_ecr_repository`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- AWS provider docs for `aws_ecr_lifecycle_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy
- AWS ECR lifecycle policy syntax: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- AWS ECR repository policies / cross-account access docs
- AzureRM provider docs for `azurerm_container_registry`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/container_registry
- AzureRM provider docs for `azurerm_role_assignment`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Microsoft Learn: ACR built-in roles (AcrPull, AcrPush)
- Google provider docs for `google_artifact_registry_repository`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository
- Google provider docs for `google_artifact_registry_repository_iam_member`
- GCP Artifact Registry cleanup policies docs
- Kubernetes provider docs for `kubernetes_secret`: https://registry.terraform.io/providers/hashicorp/kubernetes/latest/docs/resources/secret
- Kubernetes docs on `kubernetes.io/dockerconfigjson` secret type

## Issues Found
No technical issues found.

All Terraform resource attributes, IAM actions, role names, and configuration syntax verified against current official provider documentation:

- `aws_ecr_repository` attributes (`image_tag_mutability`, `image_scanning_configuration`, `encryption_configuration`) are correct.
- `aws_ecr_lifecycle_policy` JSON schema is correct: `imageCountMoreThan` does not require `countUnit`; `sinceImagePushed` correctly uses `countUnit = "days"`.
- `azurerm_container_registry` `network_rule_set` block syntax with `default_action` and `ip_rule { action, ip_range }` is valid; Premium SKU is correctly required.
- `azurerm_role_assignment` `skip_service_principal_aad_check` is valid; `AcrPull` and `AcrPush` are valid built-in roles.
- `google_artifact_registry_repository` `cleanup_policies` with `id`, `action`, and `condition { tag_prefixes, tag_state, older_than }` is correct.
- `google_artifact_registry_repository_iam_member` attributes (`repository`, `location`, `project`, `role`, `member`) are correct; `roles/artifactregistry.reader` and `roles/artifactregistry.writer` are valid IAM roles.
- ECR cross-account pull IAM actions (`ecr:GetDownloadUrlForLayer`, `ecr:BatchGetImage`, `ecr:BatchCheckLayerAvailability`) are the correct minimum set for image pulls.
- Kubernetes `kubernetes.io/dockerconfigjson` secret structure is correct - `{ auths: { registry: { auth: base64(user:password) } } }` is the standard form.

## Review Notes
- For ECR, `image_tag_mutability` now also supports newer values `IMMUTABLE_WITH_EXCLUSION` and `MUTABLE_WITH_EXCLUSION` in addition to `MUTABLE` and `IMMUTABLE`. The post's use of `IMMUTABLE` remains valid.
- The cross-account ECR pull example shows the three core actions for pulling. In practice, the puller's principal (in the target account) also needs `ecr:GetAuthorizationToken` at the registry level (Resource `*`), but this is granted via the IAM identity in the puller's account, not the repository policy itself - so it does not belong in the repository policy shown.
- For Azure, Microsoft now offers ABAC-enabled registries with newer roles like `Container Registry Repository Reader/Writer`. The post's use of `AcrPull`/`AcrPush` remains correct for standard RBAC mode and is the more widely applicable choice today.
- The `kubernetes_secret` `data` field values are automatically base64-encoded by the Terraform Kubernetes provider. The `auth` field within the dockerconfigjson must be pre-base64-encoded (`username:password`), which the post correctly does via `base64encode()`.
- The Kubernetes dockerconfigjson canonical format also accepts `username`, `password`, `email` fields alongside `auth`. The minimal form using only `auth` shown in the post is sufficient and widely used.
