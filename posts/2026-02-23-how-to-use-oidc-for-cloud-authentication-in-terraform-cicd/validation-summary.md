# Validation Summary: How to Use OIDC for Cloud Authentication in Terraform CI/CD

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Terraform
- OpenID Connect (OIDC)
- GitHub Actions
- GitLab CI/CD
- AWS IAM and STS
- Google Cloud Workload Identity Federation
- Microsoft Entra ID / Azure federated credentials
- Azure Login GitHub Action

## Sources Consulted
- GitHub Docs: OpenID Connect reference, https://docs.github.com/en/actions/reference/security/oidc
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services, https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- AWS configure-aws-credentials action README, https://github.com/aws-actions/configure-aws-credentials
- AWS CLI Command Reference: sts assume-role-with-web-identity, https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role-with-web-identity.html
- AWS SDKs and Tools Reference: Assume role credential provider, https://docs.aws.amazon.com/sdkref/latest/guide/feature-assume-role-credentials.html
- Terraform Registry: aws_iam_openid_connect_provider, https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider
- Terraform Registry: google_iam_workload_identity_pool_provider, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool_provider
- Google Cloud IAM: Configure Workload Identity Federation with deployment pipelines, https://cloud.google.com/iam/docs/workload-identity-federation-with-deployment-pipelines
- google-github-actions/auth README, https://github.com/google-github-actions/auth
- Terraform Registry: azuread_application_federated_identity_credential, https://registry.terraform.io/providers/hashicorp/azuread/latest/docs/resources/application_federated_identity_credential
- Terraform Registry: azurerm_role_assignment, https://registry.terraform.io/providers/hashicorp/azurerm/latest/docs/resources/role_assignment
- Azure Login GitHub Action documentation, https://github.com/Azure/login
- GitLab Docs: OpenID Connect Authentication Using ID Tokens, https://docs.gitlab.com/ci/secrets/id_token_authentication/
- GitLab Docs: Configure OpenID Connect in AWS to retrieve temporary credentials, https://docs.gitlab.com/ci/cloud_services/aws/

## Issues Found
- The post said temporary credentials expire when the pipeline run ends. I changed this to say they expire after the configured short session duration, which matches AWS STS and cloud-provider behavior.
- The AWS Terraform example hard-coded GitHub's historical OIDC thumbprint. I removed the thumbprint and noted that AWS validates GitHub through its trusted CA list, because current AWS and Terraform provider docs say GitHub thumbprints are optional or ignored.
- The GCP workflow example was labeled as a workflow file but omitted a workflow name and trigger. I added minimal `name` and `on` entries so the YAML is a valid GitHub Actions workflow.
- The Azure GitHub Actions example omitted the required `id-token: write` permission and was only a step fragment. I converted it into a minimal valid workflow example with permissions, trigger, job, and step.
- The GitLab CI example used the Terraform image but called the AWS CLI, which is not guaranteed to be present in that image. I changed it to write the GitLab OIDC token to a file and use the standard `AWS_ROLE_ARN`, `AWS_WEB_IDENTITY_TOKEN_FILE`, and `AWS_ROLE_SESSION_NAME` environment variables so Terraform's AWS provider can obtain web identity credentials directly.
- The GitLab CI token audience was set to `https://gitlab.com` without noting the AWS-side audience requirement. I changed it to `sts.amazonaws.com` and clarified that it must match the audience configured in AWS IAM.
- The troubleshooting OIDC token decoder was marked as Bash while containing a GitHub Actions step, and it decoded JWT payloads as plain base64 without base64url conversion or padding. I changed the fence to YAML and added base64url normalization before decoding.

## Review Notes
- The example IAM policy grants broad permissions for demonstration. It is syntactically valid, but a production workflow should scope permissions to the resources Terraform actually manages.
- The GCP attribute condition restricts by GitHub organization name. Google recommends stable numeric IDs where possible for stronger protection against namespace reuse.
