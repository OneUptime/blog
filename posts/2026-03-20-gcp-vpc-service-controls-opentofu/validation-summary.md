# Validation Summary: How to Configure GCP VPC Service Controls with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- VPC Service Controls
- Access Context Manager
- OpenTofu / Terraform-style HCL
- BigQuery
- Cloud Storage
- Pub/Sub

## Sources Consulted
- Google Cloud Access Context Manager AccessPolicy REST reference: https://cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies
- Google Cloud Access Context Manager AccessLevels REST reference: https://cloud.google.com/access-context-manager/docs/reference/rest/v1/accessPolicies.accessLevels
- Google Cloud VPC Service Controls ingress and egress rules reference: https://cloud.google.com/vpc-service-controls/docs/ingress-egress-rules
- Google Cloud VPC Service Controls overview: https://cloud.google.com/vpc-service-controls/docs/overview
- Google Cloud BigQuery with VPC Service Controls: https://cloud.google.com/bigquery/docs/vpc-sc
- Google Cloud supported service method restrictions for VPC Service Controls: https://cloud.google.com/vpc-service-controls/docs/supported-method-restrictions
- Google Cloud supported products and limitations for VPC Service Controls: https://cloud.google.com/vpc-service-controls/docs/supported-products
- HashiCorp Google provider docs for `google_access_context_manager_access_policy`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/access_context_manager_access_policy.html.markdown
- HashiCorp Google provider docs for `google_access_context_manager_access_level`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/access_context_manager_access_level.html.markdown
- HashiCorp Google provider docs for `google_access_context_manager_service_perimeter`: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/access_context_manager_service_perimeter.html.markdown

## Issues Found
- The overview overstated perimeter behavior as general resource-to-resource communication control. I changed it to describe VPC Service Controls accurately as controlling access to supported Google Cloud services across the perimeter.
- The service perimeter example used `identity_type = "SERVICE_ACCOUNT"`, which is not a valid enum value for this resource. I removed that field and kept an explicit `identities` allowlist for the intended single service account use case.
- The ingress rule referenced `google_service_account.data_sa.email`, but that resource was not defined anywhere in the post. I replaced it with `var.data_service_account_email` so the example is internally consistent with the other variable-based inputs.
- The ingress rule omitted `sources`, but Google’s ingress rule reference requires a source definition for a functional ingress rule. I added `sources { access_level = "*" }` to allow the explicitly listed service account from any source.
- The BigQuery method selector used `google.cloud.bigquery.v2.TableService.ListTables`, but Google’s supported method restrictions reference lists the supported BigQuery method as `TableService.ListTables`. I corrected the method name.
- The dry-run comment implied a `dry_run` setting exists on the resource. I corrected the note to point to the actual provider mechanism: an explicit `spec` block plus `use_explicit_dry_run_spec = true`.
- The summary claimed VPC Service Controls restricts generic API access. I tightened that wording to supported Google Cloud service APIs, which matches the product documentation.

## Review Notes
- VPC Service Controls only applies to supported products and supported method restrictions; support varies by service, and some methods are exceptions that cannot be controlled.
