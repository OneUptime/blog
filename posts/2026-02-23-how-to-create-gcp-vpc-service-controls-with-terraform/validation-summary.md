# Validation Summary: How to Create GCP VPC Service Controls with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP)
- VPC Service Controls
- Access Context Manager
- HashiCorp Terraform `google` provider resources:
  - `google_access_context_manager_access_policy`
  - `google_access_context_manager_access_level`
  - `google_access_context_manager_service_perimeter`
  - `google_project` data source
- GCP services referenced: BigQuery, Cloud Storage, Bigtable, Spanner, Pub/Sub, Secret Manager, Cloud Functions, Cloud Run, Cloud Build

## Sources Consulted
- Terraform `google_access_context_manager_service_perimeter` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_service_perimeter
- Terraform `google_access_context_manager_access_level` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_level
- Terraform `google_access_context_manager_access_policy` docs: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/access_context_manager_access_policy
- GCP Access Context Manager method selectors docs: https://cloud.google.com/access-context-manager/docs/method-selectors
- GCP VPC Service Controls supported method restrictions: https://cloud.google.com/vpc-service-controls/docs/supported-method-restrictions
- HashiCorp provider source: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/access_context_manager_service_perimeter.html.markdown

## Issues Found
- **Invalid method selector `"BigQueryRead"`**: The ingress policy used `method = "BigQueryRead"` as a method selector for `bigquery.googleapis.com`. Per the GCP supported method restrictions documentation, `BigQueryRead` is a service prefix and valid method selectors require a method suffix (e.g., `BigQueryRead.ReadRows`, `BigQueryRead.CreateReadSession`, `BigQueryRead.SplitReadStream`). Fixed by changing to `method = "BigQueryRead.ReadRows"`, which is a real, documented method.

## Review Notes
- All other Terraform resource argument names, block structures, and field formats (e.g., `accessPolicies/{policy}/accessLevels/{short_name}` name format, `combining_function = "AND"`, `perimeter_type = "PERIMETER_TYPE_REGULAR"` / `PERIMETER_TYPE_BRIDGE`, `use_explicit_dry_run_spec` with `spec {}` block) are correct against the current HashiCorp `google` provider documentation.
- The bridge perimeter example correctly limits itself to `resources` only — bridge perimeters cannot contain `access_levels`, `restricted_services`, `ingress_policies`, or `egress_policies`, and the post adheres to this.
- The claim that VPC Service Controls operates on project numbers (not project IDs) is accurate, and the `data "google_project"` workaround shown is the recommended approach.
- All nine GCP service endpoint names listed in `restricted_services` blocks are valid.
- `identity_type = "ANY_IDENTITY"` is one of the valid values (others: `ANY_USER_ACCOUNT`, `ANY_SERVICE_ACCOUNT`).
- Minor pedagogical note (no fix made): the `vpn_users` access level uses `10.0.0.0/8` as an `ip_subnetwork`. VPCSC IP-based access levels evaluate the public source IP of API requests, so private RFC1918 ranges generally won't match traffic actually reaching Google APIs unless that range egresses unchanged via specific networking setups. This is a real but commonly demonstrated pattern and not a syntax/API error.
