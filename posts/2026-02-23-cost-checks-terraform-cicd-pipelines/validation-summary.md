# Validation Summary: How to Implement Cost Checks in Terraform CI/CD Pipelines

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Terraform CLI and Terraform plan JSON
- GitHub Actions
- Infracost CLI and Infracost GitHub Actions
- Open Policy Agent (OPA) and Rego
- jq and shell scripting
- AWS Budgets

## Sources Consulted
- Terraform JSON output format: https://developer.hashicorp.com/terraform/internals/json-format
- Terraform plan command reference: https://developer.hashicorp.com/terraform/cli/commands/plan
- Infracost GitHub Actions documentation: https://www.infracost.io/docs/integrations/github_actions/
- Infracost CLI commands documentation: https://www.infracost.io/docs/features/cli_commands/
- Infracost Plan JSON API documentation: https://www.infracost.io/docs/integrations/infracost_api/
- Infracost JSON schema: https://github.com/infracost/infracost/blob/master/schema/infracost.schema.json
- Infracost OPA integration documentation: https://www.infracost.io/docs/integrations/open_policy_agent/
- OPA documentation for `opa eval`, Rego syntax, input, and output formats: https://www.openpolicyagent.org/docs
- GitHub Actions workflow permissions documentation: https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax#permissions
- GitHub OIDC with AWS documentation: https://docs.github.com/en/actions/how-tos/security-for-github-actions/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services
- AWS configure credentials action documentation: https://github.com/aws-actions/configure-aws-credentials
- Terraform AWS provider `aws_budgets_budget` resource documentation: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/budgets_budget
- AWS Budgets filter documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/budgets-create-filters.html/
- AWS cost allocation tag documentation: https://docs.aws.amazon.com/awsaccountbilling/latest/aboutv2/custom-tags.html

## Issues Found
- The GitHub Actions workflow used `aws-actions/configure-aws-credentials` with `role-to-assume` but did not grant `id-token: write`. Added that permission so OIDC role assumption can work.
- The workflow later adds labels to pull requests, but the top-level token permissions did not include `issues: write`. Added `issues: write` for the label API call while keeping `pull-requests: write` for PR comments and review requests.
- The OPA/Rego example used pre-OPA-v1 partial-set rule syntax (`deny[msg] { ... }`). Updated it to current Rego v1 syntax (`deny contains msg if { ... }` and `warn contains msg if { ... }`) because the pipeline installs the latest OPA binary.
- The Rego policy compared `input.diffTotalMonthlyCost` as a number even though Infracost JSON exposes cost totals as strings. Updated the policy to use `to_number(input.diffTotalMonthlyCost)`.
- The OPA installation URL used the non-static Linux binary. Updated it to `opa_linux_amd64_static`, the current recommended Linux static download target for CI-style installation.
- The AWS Budgets tag filter example did not mention that the tag key must be activated as an AWS cost allocation tag before it can be used for budget filtering. Added a concise comment above the resource.

## Review Notes
- The Infracost examples are broadly valid, but Infracost's current documentation recommends generating CI workflows with `infracost ci setup --ci-pipeline` or using the GitHub App for many teams. The existing manual workflow remains technically valid.
- The custom Terraform plan checks are heuristic guardrails, not real cost estimation. They correctly use Terraform plan JSON structure, but they only catch selected resource patterns.
