# Validation Summary: How to Create ECR Repositories with Lifecycle Policies in OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS Amazon ECR
- AWS IAM
- AWS CLI
- Docker

## Sources Consulted
- OpenTofu CLI commands: https://opentofu.org/docs/cli/commands/
- AWS provider `aws_ecr_repository`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository
- AWS provider `aws_ecr_registry_scanning_configuration`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_registry_scanning_configuration
- AWS provider `aws_ecr_lifecycle_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_lifecycle_policy
- AWS provider `aws_ecr_repository_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository_policy
- AWS provider `aws_iam_policy`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_policy
- Amazon ECR image scanning overview: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Configuring basic scanning for images in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-basic-enabling.html
- PutImageScanningConfiguration API reference: https://docs.aws.amazon.com/AmazonECR/latest/APIReference/API_PutImageScanningConfiguration.html
- Automate the cleanup of images by using lifecycle policies in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html
- Lifecycle policy properties in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Examples of lifecycle policies in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_examples.html
- Private repository policy examples in Amazon ECR: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html
- IAM permissions for pushing an image to an Amazon ECR private repository: https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-push-iam.html
- AWS CLI `ecr get-login-password`: https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html

## Issues Found
- Step 1 used repository-level `image_scanning_configuration { scan_on_push = true }` and labeled it as enhanced scanning. AWS now documents registry-level scanning configuration as the current approach, and the underlying `PutImageScanningConfiguration` API is being deprecated. I replaced it with `aws_ecr_registry_scanning_configuration` using `scan_type = "BASIC"` and a `SCAN_ON_PUSH` rule scoped to the repository so the example matches current AWS guidance and the scan-on-push behavior the post actually demonstrates.
- The introduction claimed lifecycle policies can reduce storage costs by 90%. That figure was not supported by the official documentation I checked, so I changed it to a non-numeric cost-control statement.
- The final lifecycle rule was described as removing “all images older than 90 days.” AWS’s lifecycle evaluation rules say lower-priority `tagStatus = "any"` rules cannot expire images already identified by higher-priority tagged rules, so I rewrote the rule comment and description to reflect the actual behavior.
- The cross-account section implied the repository policy by itself enables pulls and the conclusion said the policy allowed dev/staging pushes. AWS documents that `ecr:GetAuthorizationToken` must be granted through IAM before principals can authenticate, and the shown repository policy grants pull actions only. I corrected the comments and conclusion to match that access model.

## Review Notes
- The example now configures basic scan-on-push. If the author wants Amazon Inspector-backed enhanced scanning instead, the registry scan type should be `ENHANCED` and the post should call out the different behavior and pricing model explicitly.
- The AWS CLI login command is correct, but the region passed to `aws ecr get-login-password` and the registry URL must match the region where the repository exists.
