# Validation Summary: How to Troubleshoot Provider Authentication Issues in OpenTofu

## Status
validated

## Post Type
Troubleshooting Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- AWS CLI, AWS IAM, AWS STS, AWS SSO, EC2 Instance Metadata Service (IMDS)
- Azure CLI, Azure Service Principals, Azure RBAC
- GCP CLI (gcloud), GCP Service Accounts, Application Default Credentials (ADC)
- GitHub Actions with OIDC / Workload Identity Federation
- HCL provider configuration for `aws`, `azurerm`, and (implicitly) `google`

## Sources Consulted
- AWS CLI reference for `sts get-caller-identity` and `sso login` (https://docs.aws.amazon.com/cli/latest/reference/sts/get-caller-identity.html)
- AWS provider credential chain docs (https://registry.terraform.io/providers/hashicorp/aws/latest/docs#authentication-and-configuration)
- EC2 Instance Metadata Service documentation (https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instance-metadata-v2-how-it-works.html)
- ECS task role / `AWS_CONTAINER_CREDENTIALS_RELATIVE_URI` docs (https://docs.aws.amazon.com/AmazonECS/latest/developerguide/task-iam-roles.html)
- Azure CLI reference for `az account` and `az login --service-principal` (https://learn.microsoft.com/en-us/cli/azure/account)
- AzureRM provider authentication docs (https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/guides/service_principal_client_secret)
- gcloud CLI reference for `auth list`, `auth activate-service-account`, `auth application-default login` (https://cloud.google.com/sdk/gcloud/reference/auth)
- Google provider ADC docs (https://registry.terraform.io/providers/hashicorp/google/latest/docs/guides/provider_reference)
- GitHub Actions: `aws-actions/configure-aws-credentials@v4`, `azure/login@v2`, `google-github-actions/auth@v2` action READMEs

## Issues Found
1. **Misleading comment on the IMDS curl (line 28):** The comment read `# 3. Instance/ECS/Lambda role (when running in AWS)` but the `http://169.254.169.254/...` endpoint is the EC2 Instance Metadata Service only. ECS tasks use the container credentials endpoint at `169.254.170.2` via `$AWS_CONTAINER_CREDENTIALS_RELATIVE_URI`, and Lambda uses environment variables supplied by the runtime. Changed the comment to `# 3. EC2 instance role (IMDS - ECS and Lambda use different endpoints)` to avoid the misleading claim.

2. **Outdated Azure login action version:** The CI/CD example used `azure/login@v1`. `azure/login@v2` is the current GA major version recommended by Microsoft for OIDC-based authentication, and `v1` is on a maintenance track. Updated to `azure/login@v2` for consistency with `aws-actions/configure-aws-credentials@v4` and `google-github-actions/auth@v2` elsewhere in the same snippet.

## Review Notes
- The IMDS `curl` command will fail on instances that enforce IMDSv2 (token-required mode), which is the default for new EC2 launches. For troubleshooting on such instances, users need to first `PUT` to `/latest/api/token` and pass the token via `X-aws-ec2-metadata-token`. Not fixed because the existing command is still valid on IMDSv1-enabled instances and the broader credential-chain point is correctly made.
- The `InvalidClientTokenId` error description ("wrong region for credential type") is a reasonable shorthand but the error most literally means the access key ID does not exist or is disabled in the target AWS partition/account. Left as written since the author's framing is a common practical cause.
- The `azurerm` provider block uses `features {}` which is still required as of the 4.x provider series.
- `google-github-actions/auth@v2` correctly uses the `workload_identity_provider` + `service_account` inputs for Workload Identity Federation.
