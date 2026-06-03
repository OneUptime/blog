# Validation Summary: How to Deploy Amplify Backend Resources with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Amplify Hosting
- Terraform
- HashiCorp AWS Provider
- GitHub Actions
- GitHub personal access tokens
- AWS Cognito
- DNS and custom domains
- Next.js SSR hosting

## Sources Consulted
- Terraform AWS Provider `aws_amplify_app` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_app
- Terraform AWS Provider `aws_amplify_branch` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_branch
- Terraform AWS Provider `aws_amplify_domain_association` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_domain_association
- Terraform AWS Provider `aws_amplify_webhook` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/amplify_webhook
- AWS Amplify Hosting Next.js SSR deployment documentation: https://docs.aws.amazon.com/amplify/latest/userguide/deploy-nextjs-app.html
- AWS Amplify Hosting GitHub access documentation: https://docs.aws.amazon.com/amplify/latest/userguide/setting-up-GitHub-access.html
- AWS Amplify CreateApp API reference: https://docs.aws.amazon.com/amplify/latest/APIReference/API_CreateApp.html
- GitHub Actions `GITHUB_TOKEN` documentation: https://docs.github.com/actions/concepts/security/github_token
- GitHub Actions OIDC for AWS documentation: https://docs.github.com/en/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- AWS configure-aws-credentials action documentation: https://github.com/aws-actions/configure-aws-credentials

## Issues Found
- The Amplify build spec used `baseDirectory: build` while the app configuration used `platform = "WEB_COMPUTE"` and branch examples used `framework = "Next.js - SSR"`. AWS Amplify's Next.js SSR documentation requires `.next` as the build artifact directory, so the build spec was changed to `baseDirectory: .next`.
- The Amplify app example included SPA-style rewrite rules targeting `/index.html`. Those rules are not appropriate for the shown Next.js SSR deployment because the artifact is `.next`, not a static `index.html` build output. The rewrite rules were removed from the SSR example.
- Comments described `enable_branch_auto_build` as branch auto-detection and `platform = "WEB_COMPUTE"` as framework auto-detection. The Terraform provider documentation defines those as branch auto-build and app platform settings, so the comments were corrected.
- The backend resource snippet showed a second `aws_amplify_app.main` block without clarifying that the environment variables should be added to the existing app resource. The wording was updated to make that intent explicit.
- The variables section omitted variables used by the branch examples, including staging basic-auth credentials and development/feature-branch settings. Those variable declarations were added.
- The GitHub Actions workflow passed `${{ secrets.GITHUB_TOKEN }}` as the Amplify GitHub access token. AWS Amplify expects a GitHub personal access token for `access_token`, and GitHub documents `GITHUB_TOKEN` as a job-scoped installation token. The workflow now uses a dedicated `AMPLIFY_GITHUB_ACCESS_TOKEN` secret.
- The GitHub Actions workflow did not configure AWS credentials before running Terraform. It now includes OIDC permissions and the official `aws-actions/configure-aws-credentials` step.
- The access-token rotation note incorrectly recommended a GitHub App installation token as a longer-lived credential. It now recommends storing the Amplify GitHub personal access token securely and rotating it before expiry.
- The introduction and description referred to "backend environments" even though the post demonstrates related backend AWS resources rather than the Terraform `aws_amplify_backend_environment` resource. The wording was corrected.

## Review Notes
- Terraform was not installed in the local environment, so I could not run `terraform validate`. The HCL resource and argument names were checked against current provider documentation instead.
- The custom domain output examples are consistent with the provider's exported `certificate_verification_dns_record` and `sub_domain[*].dns_record` attributes, but users still need to create the actual DNS records with their DNS provider or Route 53.
