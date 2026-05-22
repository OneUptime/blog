# Validation Summary: How to Implement Terraform CI/CD Security Best Practices

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Terraform
- Terraform AWS provider
- Terraform S3 backend
- AWS IAM and OIDC federation
- AWS S3 and KMS
- GitHub Actions
- Trivy
- Checkov
- TruffleHog

## Sources Consulted
- HashiCorp Terraform S3 backend documentation: https://developer.hashicorp.com/terraform/language/backend/s3
- Terraform AWS provider `aws_iam_openid_connect_provider` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider.html
- Terraform AWS provider `aws_s3_bucket_server_side_encryption_configuration` documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/s3_bucket_server_side_encryption_configuration
- GitHub Docs, Configuring OpenID Connect in Amazon Web Services: https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- GitHub Docs, Workflow expressions: https://docs.github.com/en/actions/reference/workflows-and-actions/expressions
- aws-actions/configure-aws-credentials documentation: https://github.com/aws-actions/configure-aws-credentials
- hashicorp/setup-terraform documentation and releases: https://github.com/hashicorp/setup-terraform
- Aqua Security Trivy Action documentation: https://github.com/aquasecurity/trivy-action
- Truffle Security GitHub Action guidance: https://trufflesecurity.com/blog/running-trufflehog-in-a-github-action
- AWS IAM global condition context keys: https://docs.aws.amazon.com/IAM/latest/UserGuide/reference_policies_condition-keys.html

## Issues Found
- The first GitHub Actions example ran `terraform apply -auto-approve tfplan` without setting up Terraform or creating the `tfplan` file. Added `hashicorp/setup-terraform@v3`, `terraform init`, and `terraform plan -out=tfplan` before apply.
- The AWS OIDC provider example hardcoded a GitHub certificate thumbprint. Current AWS/Terraform behavior allows omitting `thumbprint_list` for GitHub, and AWS ignores configured thumbprints for GitHub validation. Removed the hardcoded thumbprint.
- The OIDC trust policy used a branch-based `sub` claim while the workflow used a GitHub environment. GitHub requires environment-based `sub` claims when an environment is present. Changed the condition to `repo:myorg/infra:environment:production`.
- The Terraform S3 backend used deprecated DynamoDB locking. Replaced `dynamodb_table` with `use_lockfile = true`.
- The IAM policy for Terraform state access omitted required `s3:ListBucket` and KMS permissions and granted `s3:DeleteObject` on the state file. Updated the S3 permissions to match Terraform S3 backend requirements for the state object and `.tflock` object, and added `kms:Encrypt`, `kms:Decrypt`, and `kms:GenerateDataKey` for the customer-managed KMS key.
- The state bucket logging example referenced `aws_s3_bucket.access_logs` without defining it. Added the missing access log bucket resource.
- The scanning section used tfsec, which Aqua has merged into Trivy. Replaced the tfsec action with `aquasecurity/trivy-action@v0.36.0` configured for Terraform/IaC scanning, and updated the final checklist accordingly.

## Review Notes
- Terraform was not installed in the local workspace, so local `terraform fmt` or `terraform validate` could not be run. The updated snippets were checked against official documentation instead.
- The post still uses tag-based GitHub Action references in illustrative examples, while the supply-chain section correctly recommends pinning actions to commit SHAs. A future editorial pass could pin every action example consistently, but the current examples remain understandable as short-form snippets.
