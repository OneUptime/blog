# Validation Summary: How to Fix Terraform GCP Quota Exceeded Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HashiCorp)
- Google Cloud Platform (GCP) Compute Engine
- Google Cloud SDK (gcloud CLI)
- GCP quotas and Service Usage API
- Cloud NAT, Cloud Router
- Cloud Monitoring (alert policies, quota metrics)
- Terraform `google` provider resources/data sources (`google_compute_instance`, `google_compute_disk`, `google_compute_router`, `google_compute_router_nat`, `google_compute_region`, `google_monitoring_alert_policy`)

## Sources Consulted
- gcloud topic projections: https://cloud.google.com/sdk/gcloud/reference/topic/projections
- gcloud compute disks list reference: https://cloud.google.com/sdk/gcloud/reference/compute/disks/list
- gcloud alpha services quota update: https://cloud.google.com/sdk/gcloud/reference/alpha/services/quota
- Compute Engine quotas and limits: https://cloud.google.com/compute/quotas-limits
- VPC quotas: https://cloud.google.com/vpc/docs/quota
- Terraform `google_compute_region` data source: https://registry.terraform.io/providers/hashicorp/google/latest/docs/data-sources/compute_region
- Terraform `google_compute_router_nat` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_router_nat
- Cloud Monitoring quota metrics: https://cloud.google.com/monitoring/alerts/using-quota-metrics

## Issues Found
1. **Invalid gcloud format projection** (Checking Current Quota Usage section). The command used `--format="value(quotas[metric=CPUS].limit, quotas[metric=CPUS].usage)"`. gcloud projection syntax does not support inline `[key=value]` filters on slice elements. Replaced with the canonical `--flatten=quotas --filter="quotas.metric=CPUS" --format="value(quotas.limit, quotas.usage)"` pattern.
2. **Incorrect metric name in quota update** (Fix 1). The `gcloud alpha services quota update` example used `compute.googleapis.com/cpus_per_project`, but the correct metric is `compute.googleapis.com/cpus`. Updated to the correct name.
3. **Incorrect unit for regional CPU quota** (Fix 1). The `--unit` value was URL-encoded as `1%2F%7Bproject%7D` (`1/{project}`), which is the unit for project-level quotas, not regional ones. Since the example targets `region=us-central1`, the regional unit `1/{project}/{region}` is required. Updated to `--unit="1/{project}/{region}"` (unencoded with quoting).
4. **Malformed gcloud filter for unattached disks** (Fix 4). The original filter `--filter="users:('') OR -users:*"` contained an invalid `users:('')` clause. Standard idiom is `--filter="-users:*"` (or `"NOT users:*"`). Simplified accordingly and adjusted the comment to reflect that the filter now returns only unattached disks.

## Review Notes
- Default quota values in the "Common Quotas and Their Defaults" table are approximate and vary by account age, billing status, and Google-side changes. CPUS_ALL_REGIONS, for example, is commonly 32 for newer billing-enabled projects and can be 24 or lower in other cases. The table is acceptable as illustrative but readers should treat the exact numbers as starting points and verify via the Quotas page.
- SUBNETWORKS quota: the legacy `SUBNETWORKS` quota (default 100 per project) has been superseded in many Google Cloud configurations by "Subnetwork ranges per VPC network" (currently default 400 per VPC). The example error message and table entry reflect the legacy quota, which is still recognizable to many users but may not match current console wording for new projects. Left as-is since the post's intent is illustrative.
- The Debian 11 image (`debian-cloud/debian-11`) is still supported but Debian 12 is the current stable release. Not changed since Debian 11 remains valid.
- The `gcloud alpha services quota update` command remains in `alpha` and its syntax may evolve; readers should consult `gcloud alpha services quota --help` for their installed SDK version.
- The Cloud Monitoring alert example uses a `threshold_value` of 0.8 against the quota allocation usage ratio (0-1), which correctly represents an 80% utilization trigger.
