# Validation Summary: How to Use Cross-Organization Identity Federation Between GCP Organizations

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud IAM
- Workload Identity Federation
- Workforce Identity Federation
- OpenID Connect
- Service account impersonation
- Google Cloud CLI
- BigQuery
- Cloud Storage
- Terraform Google provider
- VPC Service Controls
- Python google-auth

## Sources Consulted
- Google Cloud IAM: Workload Identity Federation, https://cloud.google.com/iam/docs/workload-identity-federation
- Google Cloud IAM: Configure Workload Identity Federation with other identity providers, https://cloud.google.com/iam/docs/workload-identity-federation-with-other-providers
- Google Cloud IAM: Workforce Identity Federation, https://cloud.google.com/iam/docs/workforce-identity-federation
- Google Cloud IAM: Identity federation products and limitations, https://cloud.google.com/iam/docs/federated-identity-supported-services
- Google Cloud SDK: `gcloud iam workload-identity-pools create-cred-config`, https://cloud.google.com/sdk/gcloud/reference/iam/workload-identity-pools/create-cred-config
- Google Cloud SDK: `gcloud access-context-manager perimeters create`, https://cloud.google.com/sdk/gcloud/reference/access-context-manager/perimeters/create
- Google Cloud VPC Service Controls: Service perimeter details and configuration, https://cloud.google.com/vpc-service-controls/docs/service-perimeters
- Google Cloud VPC Service Controls: Sharing across perimeters with bridges, https://cloud.google.com/vpc-service-controls/docs/share-across-perimeters
- Google Auth Python: `google.auth.identity_pool`, https://googleapis.dev/python/google-auth/latest/reference/google.auth.identity_pool.html
- Terraform Registry: `google_iam_workload_identity_pool_provider`, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/iam_workload_identity_pool_provider

## Issues Found
- The post described Workload Identity Federation as the path for human users from another organization. Google documents Workforce Identity Federation for human user SSO and Workload Identity Federation for workloads. I narrowed the article wording to workloads and added a short note that human user SSO should use Workforce Identity Federation.
- The OIDC provider example used `https://accounts.google.com` and implied Google Workspace or Cloud Identity users could use the workload identity pool path directly. I changed the example to a generic Organization B workload OIDC issuer and audience.
- The OIDC attribute mapping included `google.groups=assertion.groups`, but a generic OIDC token is not guaranteed to include that claim. I removed the groups mapping from the sample.
- The warning after the provider setup said any Google account could authenticate without the condition. After changing the provider to a generic Org B OIDC issuer, I corrected the warning to say that any token from the trusted issuer with an accepted audience could authenticate.
- The local access example used invalid `create-cred-config` flags: `--credential-source-command` is not a current flag. I changed the example to the documented `--credential-source-file` flow.
- The provider ID `org-b-google` was misleading after the OIDC issuer correction. I renamed it to `org-b-oidc` in the commands and Python credential configuration.
- The Terraform example referenced `data.google_project.org_a.number` without defining that data source. I changed the allowed audience to the same explicit OIDC audience used in the gcloud example.
- The Terraform example granted the impersonated service account `roles/bigquery.dataViewer` but not `roles/bigquery.jobUser`, which is needed to run BigQuery jobs. I added a `google_project_iam_member` for `roles/bigquery.jobUser`.
- The VPC Service Controls section implied that one service perimeter should include projects from both organizations. I changed it to create the perimeter around the Organization A resource project and describe ingress/egress rules for Organization B access.

## Review Notes
- The post is technically relevant and contains implementation details, so it was reviewed as a code tutorial.
- The local environment did not have `gcloud`, `bq`, or Terraform installed, so CLI and Terraform command validation was performed against current official documentation instead of local `--help` output.
- The Python code block was checked for syntax validity with `ast.parse`.
