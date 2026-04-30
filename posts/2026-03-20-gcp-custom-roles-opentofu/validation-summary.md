# Validation Summary: How to Create GCP Custom Roles with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu
- HCL
- Google Cloud IAM custom roles
- Google Cloud project-level and organization-level IAM
- Cloud SQL
- Cloud Run
- Artifact Registry
- Cloud Billing and budgets

## Sources Consulted
- OpenTofu provider requirements: https://opentofu.org/docs/language/providers/requirements/
- OpenTofu `tofu plan` command: https://opentofu.org/docs/cli/commands/plan/
- Google provider `google_project_iam_custom_role` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_project_iam_custom_role.html.markdown
- Google provider `google_organization_iam_custom_role` resource documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/google_organization_iam_custom_role.html.markdown
- Google Cloud IAM roles overview: https://cloud.google.com/iam/docs/roles-overview
- Create and manage custom roles: https://cloud.google.com/iam/docs/creating-custom-roles
- Cloud SQL roles and permissions: https://cloud.google.com/iam/docs/roles-permissions/cloudsql
- Cloud Run IAM roles and required deployment permissions: https://cloud.google.com/run/docs/reference/iam/roles
- Deploying to Cloud Run from Artifact Registry: https://cloud.google.com/artifact-registry/docs/integrate-cloud-run
- Container Registry deprecation / transition guidance: https://cloud.google.com/artifact-registry/docs/transition/transition-from-gcr
- Create custom roles for Cloud Billing accounts: https://cloud.google.com/billing/docs/how-to/custom-roles
- Cloud Billing API access control: https://cloud.google.com/billing/docs/access-control
- IAM permissions reference: https://cloud.google.com/iam/docs/permissions-reference

## Issues Found
1. **CI/CD deployer example used outdated and inaccurate registry permissions**: The post described deployment to "Cloud Run and GCR" even though Container Registry is deprecated and shut down for writes as of March 18, 2025. The permission list also omitted `run.operations.get`, used several unnecessary Artifact Registry permissions for a deploy-only scenario, and misspelled `iam.serviceAccounts.actAs` as `iam.serviceaccounts.actAs`. I updated the example to target Artifact Registry, added the current required Cloud Run deployment permission, removed obsolete GCR references, and corrected the IAM permission name and comment.
2. **Organization-level billing viewer role used the wrong cost-view permission for org-wide access**: The original role used `billing.resourceCosts.get`, which is the project-scoped permission used for viewing costs on specific projects. For organization-wide billing spend visibility, the correct permission is `billing.accounts.getSpendingInformation` on billing accounts. I replaced the permission and updated the description accordingly.
3. **Disabled-role behavior was described incorrectly**: The post said that setting `stage = "DISABLED"` prevents new assignments while existing ones still work. Official IAM documentation states that disabled roles remain in IAM policies, but bindings to them have no effect. I corrected the prose and inline comments.
4. **Organization-level custom role scope explanation was imprecise**: The text said organization roles can be assigned across projects in the org, but the official behavior is broader: they can be granted on the organization and on resources within it. I updated the sentence to match the IAM documentation more precisely.

## Review Notes
- The examples pin the Google provider to `~> 5.10`, which is older than current releases as of April 30, 2026. The resource syntax used in the post is still valid, so no change was required for correctness.
- The Cloud Run deployer example is functional, but a stricter least-privilege setup would usually grant `iam.serviceAccounts.actAs` on the specific runtime service account instead of through a project-level binding.
- The Cloud SQL custom role example uses valid permission names and valid `google_project_iam_custom_role` syntax.
