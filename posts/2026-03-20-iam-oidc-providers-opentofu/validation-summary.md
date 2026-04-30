# Validation Summary: How to Create IAM OIDC Providers with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- AWS IAM
- AWS STS
- GitHub Actions
- GitLab CI/CD
- OpenID Connect (OIDC)
- HCL
- YAML

## Sources Consulted
- AWS IAM User Guide: Obtain the thumbprint for an OpenID Connect identity provider - https://docs.aws.amazon.com/IAM/latest/UserGuide/id_roles_providers_create_oidc_verify-thumbprint.html
- AWS CLI Command Reference: `create-open-id-connect-provider` - https://docs.aws.amazon.com/cli/latest/reference/iam/create-open-id-connect-provider.html
- AWS Service Authorization Reference: Amazon ECS - https://docs.aws.amazon.com/service-authorization/latest/reference/list_amazonelasticcontainerservice.html
- AWS Service Authorization Reference: AWS Lambda - https://docs.aws.amazon.com/service-authorization/latest/reference/list_awslambda.html
- GitHub Docs: Configuring OpenID Connect in Amazon Web Services - https://docs.github.com/en/actions/how-tos/secure-your-work/security-harden-deployments/oidc-in-aws
- `aws-actions/configure-aws-credentials` official README and releases - https://github.com/aws-actions/configure-aws-credentials
- `actions/checkout` official README - https://github.com/actions/checkout/blob/main/README.md?plain=1
- GitLab Docs: Configure OpenID Connect in AWS to retrieve temporary credentials - https://docs.gitlab.com/ci/cloud_services/aws/
- GitLab Docs: OpenID Connect (OIDC) Authentication Using ID Tokens - https://docs.gitlab.com/ci/secrets/id_token_authentication/
- OpenTofu Docs: Output Values - https://opentofu.org/docs/language/values/outputs/
- OpenTofu Docs: `tofu output` command - https://opentofu.org/docs/cli/commands/output/
- Terraform AWS provider docs: `aws_iam_openid_connect_provider` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_openid_connect_provider

## Issues Found
- The GitHub and GitLab provider examples treated `thumbprint_list` as part of the normal setup flow. Current AWS provider documentation allows omitting it, and specifically notes that for providers such as GitHub and GitLab AWS uses its trusted CA store instead of configured thumbprints. I removed the `tls_certificate` lookup and both `thumbprint_list` examples to match current behavior.
- The GitHub Actions workflow used older major versions of `actions/checkout` and `aws-actions/configure-aws-credentials`. I updated the example to `@v6`, which matches the current official release line and documentation.
- The post instructed readers to run `tofu output github_actions_role_arn`, but no `output` block existed in the configuration. I added `output "github_actions_role_arn"` and changed the command to `tofu output -raw github_actions_role_arn`, which is the correct automation-friendly form for a string output.
- The GitLab trust policy only scoped access to the project with a wildcard suffix, while the post's guidance says to restrict access to specific branches or environments. I tightened the example to the documented default GitLab `sub` format for the `main` branch.

## Review Notes
- The GitLab example keeps `client_id_list = ["https://gitlab.example.com"]`, which matches GitLab's default `aud` value. If you prefer `sts.amazonaws.com` as the audience, the GitLab CI job must request that audience explicitly in its ID token configuration.
- The IAM permission examples are valid for a tutorial, but they are still broader than a production least-privilege policy. In particular, the attached ECR managed policy and the inline `Resource = "*"` statement could be narrowed in a future revision if the post is expanded beyond OIDC setup.
