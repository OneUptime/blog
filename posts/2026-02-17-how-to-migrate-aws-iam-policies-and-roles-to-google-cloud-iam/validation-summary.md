# Validation Summary: How to Migrate AWS IAM Policies and Roles to Google Cloud IAM

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- AWS IAM
- AWS IAM policies, roles, managed policies, inline policies, permission boundaries, and SCPs
- Google Cloud IAM
- Google Cloud predefined roles, custom roles, service accounts, IAM allow policies, IAM deny policies, IAM Conditions, and Organization Policy
- Workload Identity Federation
- Cloud Storage IAM
- Cloud Asset Inventory IAM analysis
- IAM Policy Troubleshooter
- Google Cloud CLI and AWS CLI

## Sources Consulted
- AWS IAM managed and inline policies: https://docs.aws.amazon.com/IAM/latest/UserGuide/access_policies_managed-vs-inline.html
- AWS IAM policies and permissions: https://docs.aws.amazon.com/en_us/IAM/latest/UserGuide/access_policies.html
- Google Cloud IAM allow policies: https://cloud.google.com/iam/docs/allow-policies
- Google Cloud IAM roles overview and custom roles: https://cloud.google.com/iam/docs/roles-overview
- Google Cloud IAM deny policies: https://cloud.google.com/iam/docs/deny-overview
- Google Cloud custom role creation: https://cloud.google.com/sdk/gcloud/reference/iam/roles/create
- Google Cloud Workload Identity Federation with AWS: https://cloud.google.com/iam/docs/workload-identity-federation-with-other-clouds
- Google Cloud Workload Identity Federation principal formats: https://cloud.google.com/iam/docs/workload-identity-federation
- Google Cloud Storage IAM roles and permissions: https://cloud.google.com/storage/docs/access-control/iam-roles
- Google Cloud bucket IAM binding command: https://cloud.google.com/sdk/gcloud/reference/storage/buckets/add-iam-policy-binding
- Google Cloud Organization Policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/org-policy-constraints
- Google Cloud Resource Locations organization policy: https://cloud.google.com/resource-manager/docs/organization-policy/defining-locations
- Google Cloud service account organization policy constraints: https://cloud.google.com/resource-manager/docs/organization-policy/restricting-service-accounts
- Google Cloud org policy CLI set-policy command: https://cloud.google.com/sdk/gcloud/reference/resource-manager/org-policies/set-policy
- Google Cloud Cloud Asset IAM policy analysis command: https://cloud.google.com/sdk/gcloud/reference/asset/analyze-iam-policy
- Google Cloud IAM Policy Troubleshooter command: https://cloud.google.com/sdk/gcloud/reference/policy-troubleshoot/iam
- Google Cloud IAM access change propagation: https://cloud.google.com/iam/docs/access-change-propagation
- Google Cloud IAM access management restrictions for Owner role: https://cloud.google.com/iam/docs/granting-changing-revoking-access

## Issues Found
- The post stated that AWS managed policies have GCP predefined role equivalents. I changed this to "approximate" equivalents and "starting points" because the services and role boundaries do not map one-to-one.
- The AWS IAM policy example was marked as JSON but contained a `//` comment, which is not valid JSON. I moved the comment into the surrounding prose.
- The Workload Identity Federation example used an ambiguous project placeholder and an `attribute.aws_role` member value that did not match the role-name mapping shown in Google Cloud's AWS federation guidance. I added an explicit AWS role-name attribute mapping and changed the member URI to use a numeric project number and role name.
- The organization policy command showed the policy file after `--organization`, which does not match the documented command shape. I moved the policy file into the positional argument slot before the organization flag.
- The validation example used `gcloud asset check-iam-policy`, which is not a current Cloud Asset Inventory command. I changed it to `gcloud asset analyze-iam-policy` with `--project`, `--full-resource-name`, and `--permissions`.
- The propagation caveat said IAM changes can take up to 60 seconds. I updated it to match Google Cloud's documented eventual consistency guidance: generally within 2 minutes, sometimes 7 minutes or longer, with group membership changes potentially longer.
- The Owner role caveat incorrectly said `roles/owner` cannot be granted via gcloud on organization resources. I replaced it with the documented project-specific restrictions for granting Owner to users outside the organization or on projects outside an organization.

## Review Notes
The role mapping table remains a high-level migration aid, not a substitute for permission-by-permission analysis. The post now labels these mappings as approximate starting points to avoid implying exact service parity.
