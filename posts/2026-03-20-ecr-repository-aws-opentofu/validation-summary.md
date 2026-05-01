# Validation Summary: How to Create an ECR Repository with OpenTofu on AWS

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / HCL
- AWS Provider for Terraform/OpenTofu
- Amazon ECR
- AWS IAM repository policies
- AWS CLI
- Docker

## Sources Consulted
- AWS Provider: `aws_ecr_repository` resource documentation - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecr_repository.html.markdown
- AWS Provider: `aws_ecr_lifecycle_policy` resource documentation - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecr_lifecycle_policy.html.markdown
- AWS Provider: `aws_ecr_repository_policy` resource documentation - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/ecr_repository_policy.html.markdown
- Amazon ECR lifecycle policies - https://docs.aws.amazon.com/AmazonECR/latest/userguide/LifecyclePolicies.html
- Amazon ECR lifecycle policy properties - https://docs.aws.amazon.com/AmazonECR/latest/userguide/lifecycle_policy_parameters.html
- Amazon ECR repository policies - https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policies.html
- Amazon ECR repository policy examples - https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html
- Amazon ECR private registry authentication - https://docs.aws.amazon.com/AmazonECR/latest/userguide/registry_auth.html
- AWS CLI `get-login-password` command reference - https://docs.aws.amazon.com/cli/latest/reference/ecr/get-login-password.html
- Amazon ECR image scanning - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning.html
- Amazon ECR basic scanning configuration - https://docs.aws.amazon.com/AmazonECR/latest/userguide/image-scanning-basic-enabling.html
- Amazon ECR encryption at rest - https://docs.aws.amazon.com/AmazonECR/latest/userguide/encryption-at-rest.html

## Issues Found
- The description claimed the post covered pull-through cache configuration, but no pull-through cache rule or configuration appeared in the post. I changed the description to mention encryption instead so the metadata matches the actual content.
- The ECR repository snippet referenced `aws_kms_key.ecr.arn` without defining that resource. I removed the explicit `kms_key` reference and kept `encryption_type = "KMS"` because both AWS and the AWS provider support using the default AWS-managed ECR KMS key when no custom key is supplied.
- The cross-account section implied the repository policy was sufficient for pulling images. I added a note that the consuming IAM principal also needs `ecr:GetAuthorizationToken` through IAM before it can authenticate to the registry, which AWS documents as required.
- The push example authenticated Docker against one registry target but tagged and pushed to a different hard-coded target. I rewrote the commands to use shared `AWS_REGION`, `AWS_ACCOUNT_ID`, and `REPOSITORY_NAME` variables so the example is internally consistent when copied.

## Review Notes
- The repository-level `image_scanning_configuration { scan_on_push = true }` block is valid for basic scanning. AWS currently recommends managing scan settings at the private-registry level when you want broader scanning control across repositories.
