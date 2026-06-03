# Validation Summary: How to Set Up ECR Repository Policies

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Elastic Container Registry (Amazon ECR)
- AWS Identity and Access Management (IAM)
- AWS Organizations condition keys
- AWS Lambda container image access
- AWS CLI
- Terraform AWS provider

## Sources Consulted
- Amazon ECR private repository policies: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policies.html
- Amazon ECR private repository policy examples: https://docs.aws.amazon.com/AmazonECR/latest/userguide/repository-policy-examples.html
- AWS CLI `ecr set-repository-policy` command reference: https://docs.aws.amazon.com/cli/latest/reference/ecr/set-repository-policy.html
- AWS CLI ECR command examples: https://docs.aws.amazon.com/cli/v1/userguide/cli_ecr_code_examples.html
- AWS Lambda container image ECR permissions: https://docs.aws.amazon.com/lambda/latest/dg/images-create.html
- Amazon ECR Service Authorization Reference: https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerregistry.html
- AWS global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html
- AWS account identifiers: https://docs.aws.amazon.com/accounts/latest/reference/manage-acct-identifiers.html
- Terraform `aws_ecr_repository_policy` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ecr_repository_policy.html

## Issues Found
- Several example IAM ARNs used 9-digit AWS account IDs, which would be malformed because AWS account IDs are 12-digit numbers. Updated those examples to 12-digit placeholder IDs.
- The Lambda repository policy used a lowercase `aws:sourceArn` key with `StringLike`. Updated it to the canonical `aws:SourceArn` global condition key and `ArnLike`, matching AWS IAM guidance for ARN comparisons.
- The common mistake note said `Principal: "*"` makes a private ECR repository publicly accessible. Private ECR still requires authenticated ECR authorization, so the wording was corrected to say it allows any authenticated AWS principal with the required ECR authorization permissions to access the specified repository actions.

## Review Notes
The ECR action lists, `ecr:GetAuthorizationToken` guidance, AWS CLI commands, Terraform resource usage, cross-account repository policy pattern, and AWS Organizations `aws:PrincipalOrgID` condition are consistent with the official documentation reviewed. Terraform was not installed locally, so HCL snippets were reviewed against Terraform provider documentation rather than validated with `terraform validate`.
