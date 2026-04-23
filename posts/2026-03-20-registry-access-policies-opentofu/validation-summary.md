# Validation Summary: How to Configure Registry Access Policies with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu / HCL
- AWS Elastic Container Registry (ECR)
- AWS IAM
- Amazon ECS
- Amazon EKS
- Azure Container Registry (ACR)
- Azure RBAC
- Azure Kubernetes Service (AKS)
- Google Artifact Registry
- Google Cloud IAM
- Google Kubernetes Engine (GKE)
- Cloud Run

## Sources Consulted
- HashiCorp AWS provider docs for `aws_ecr_registry_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_policy
- HashiCorp AWS provider docs for `aws_ecr_repository_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository_policy
- Amazon ECR private registry permissions: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry-permissions.html
- Amazon ECR registry policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry-permissions-examples.html
- Amazon ECR repository policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html
- IAM permissions for pushing an image to an Amazon ECR private repository: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html
- Using Amazon ECR images with Amazon ECS: https://docs.aws.amazon.com/AmazonECR/latest/userguide/ECR_on_ECS.html
- Amazon ECS task execution IAM role: https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task_execution_IAM_role.html
- HashiCorp AzureRM provider docs for `azurerm_role_assignment`: https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Azure Container Registry Microsoft Entra permissions and role assignments overview: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-built-in-roles-overview
- Azure ABAC repository permissions in Azure Container Registry: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-rbac-abac-repository-permissions
- Managed identity authentication for ACR: https://learn.microsoft.com/en-us/azure/container-registry/container-registry-authentication-managed-identity
- HashiCorp Google provider docs for `google_artifact_registry_repository_iam`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository_iam
- HashiCorp Google provider docs for `google_project` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/project
- Artifact Registry access control with IAM: https://cloud.google.com/artifact-registry/docs/access-control
- Deploying to Cloud Run from Artifact Registry: https://cloud.google.com/artifact-registry/docs/integrate-cloud-run

## Issues Found
- The AWS pull example used an ECS task role-style principal name. Image pulls from ECR are performed by the ECS task execution role, so the example was corrected to use `aws_iam_role.ecs_task_execution.arn`.
- The AWS IAM section was labeled as pull authentication but only granted push-oriented repository actions. It was corrected by renaming the section and adding the missing pull actions `ecr:BatchGetImage` and `ecr:GetDownloadUrlForLayer`.
- The AWS ECR repository policy section did not state that pulling principals still need identity-based permission for `ecr:GetAuthorizationToken`. A short clarification was added so the example matches AWS authentication requirements.
- The Azure example used legacy `AcrPull` and `AcrPush` roles only. It was updated to the current `Container Registry Repository Reader` and `Container Registry Repository Writer` roles, and the post now notes the legacy equivalents for registries still using `RBAC Registry Permissions`.
- The GCP example granted Artifact Registry reader access to a user-managed Cloud Run service account. For Cloud Run image access across projects, the relevant principal is the Cloud Run service agent, so the binding was corrected and a `google_project` data source was added to resolve the project number.
- The conclusion was updated so the listed pull principals match the corrected platform-specific guidance.

## Review Notes
- On GKE, correct IAM bindings can still be insufficient if node access scopes are overly restrictive in older or customized configurations.
- For Azure ACR, the appropriate built-in role names depend on the registry's role assignment permissions mode. The updated example reflects the current repository-role model and still notes the legacy role names.
