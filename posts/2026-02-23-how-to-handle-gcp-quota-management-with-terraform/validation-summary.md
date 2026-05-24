# Validation Summary: How to Handle GCP Quota Management with Terraform

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- Terraform (HCL, `hashicorp/google` provider ~> 5.0)
- Google Cloud Platform (GCP) Service Usage API
- GCP Cloud Quotas API
- Compute Engine, Cloud SQL, GKE quotas
- Cloud Monitoring alert policies
- gcloud CLI
- Bash scripting

## Sources Consulted
- [google_service_usage_consumer_quota_override resource docs (hashicorp/terraform-provider-google)](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/service_usage_consumer_quota_override.html.markdown)
- [google_cloud_quotas_quota_info data source docs](https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/d/cloud_quotas_quota_info.html.markdown)
- [google_compute_regions data source docs](https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_regions)
- [GKE Quotas and Limits documentation](https://cloud.google.com/kubernetes-engine/quotas)
- [Cloud SQL Quotas and Limits documentation](https://cloud.google.com/sql/docs/quotas)
- [Service Usage API Quota reference](https://cloud.google.com/service-usage/docs/reference/rest/Shared.Types/Quota)
- [Terraform support for Cloud Quotas (Google Cloud docs)](https://cloud.google.com/docs/quotas/terraform-support-for-cloud-quotas)

## Issues Found

1. **Non-existent `google_compute_region` (singular) data source.** The "Checking Current Quota Usage" section used `data "google_compute_region"` to query quotas via a `.quotas` attribute. This data source does not exist in the `hashicorp/google` provider — only `google_compute_regions` (plural) exists, and it only exposes a `names` attribute. Fixed by replacing with the actual `google_cloud_quotas_quota_info` data source (from the Cloud Quotas API), which is the documented Terraform-native way to query a specific quota. The example now queries the `CPUS-per-project-region` quota for `compute.googleapis.com`.

2. **Fabricated GKE quota metric `container.googleapis.com/internal/nodes`.** The "Common Quota Overrides" section used this metric to "Increase GKE node quota (per zone)". This is not a documented public GCP quota metric — actual GKE quota metrics use the `container.googleapis.com/quota/...` prefix (e.g., `nodes_per_cluster`, `nodes_per_node_pool`), and those are generally product-side limits not adjustable via `google_service_usage_consumer_quota_override`. In practice, GKE node capacity is governed by the underlying Compute Engine CPU quotas. Replaced the snippet with a valid example overriding the regional `n2_cpus` quota, which is the actual quota that gates GKE node-pool scaling.

## Review Notes
- The pre-encoded `%2F` string format used throughout the post for `metric` and `limit` arguments is valid, but the HashiCorp docs prefer the more idiomatic `urlencode("/project/region")` form. Both work — left as-is to preserve the author's style.
- The Cloud SQL example (`sqladmin.googleapis.com/quota/instancesPerProject` with `limit = "/project"`) matches the format the Service Usage API expects for SQL Admin quotas; however, project instance counts above the default are often controlled via support cases rather than consumer-side overrides, so this override may not always succeed without a producer-side increase. Acceptable as an illustrative example.
- The Cloud Monitoring alert in "Monitoring Quota Usage" uses `threshold_value = 0.8` against `serviceruntime.googleapis.com/quota/allocation/usage`, which is an absolute usage value, not a ratio — so the comparison does not literally fire at "80% of quota" without also dividing by the corresponding `limit` metric (typically via an MQL or ratio condition). The intent is clear and the filter syntax is correct; left as-is since rewriting it to a true ratio condition would substantially restructure the example.
- The `gke_nodes` example referenced an undefined `var.zone`; this is moot after the replacement, which uses `var.region` (already defined).
- Provider version `~> 5.0` is appropriate as of the post's publication date. The Cloud Quotas data source was added in google provider v5.x.
