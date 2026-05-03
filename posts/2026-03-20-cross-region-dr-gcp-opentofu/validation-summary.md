# Validation Summary: How to Set Up Cross-Region Disaster Recovery with OpenTofu on GCP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Platform (GCP)
- OpenTofu / Terraform (HCL)
- Cloud SQL for PostgreSQL (cross-region read replicas)
- Google Cloud Storage (multi-region and dual-region buckets, Turbo replication)
- Cloud DNS (primary-backup routing policy with health-check failover)
- Cloud Scheduler (scheduled SQL exports)
- Terraform Google provider resources: `google_sql_database_instance`, `google_storage_bucket`, `google_dns_managed_zone`, `google_dns_record_set`, `google_cloud_scheduler_job`

## Sources Consulted
- [Terraform Google provider — google_dns_record_set](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/dns_record_set)
- [Terraform Google provider — google_sql_database_instance](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance)
- [Terraform Google provider — google_storage_bucket](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket)
- [Terraform Google provider — google_cloud_scheduler_job](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_scheduler_job)
- [Cloud SQL Admin API v1 — instances.export](https://cloud.google.com/sql/docs/postgres/admin-api/rest/v1/instances/export)
- [Cloud Storage — Dual-region buckets and Turbo replication (RPO)](https://cloud.google.com/storage/docs/availability-durability#dual-regions)
- [Cloud DNS — Routing policies (primary-backup, geo)](https://cloud.google.com/dns/docs/zones/manage-routing-policies)

## Issues Found
1. **Incorrect Cloud SQL Admin API URL in the Cloud Scheduler `http_target.uri`.**
   The post used `https://sqladmin.googleapis.com/sql/v1/projects/.../export`. The `/sql/` prefix is part of the legacy `v1beta4` path; the v1 endpoint is rooted directly at `/v1/`. Updated the URI to `https://sqladmin.googleapis.com/v1/projects/${var.project_id}/instances/${google_sql_database_instance.primary.name}/export` so the scheduled HTTP target hits a real endpoint.
2. **Missing required `ip_protocol` field in the `internal_load_balancers` block of the Cloud DNS `primary_backup` routing policy.**
   The Terraform Google provider requires `ip_protocol` (valid values: `tcp`, `udp`) on each `internal_load_balancers` entry. Without it, `tofu plan`/`apply` fails schema validation. Added `ip_protocol = "tcp"` alongside the other load-balancer attributes for the primary target.

## Review Notes
- `replica_configuration.failover_target = false` is shown on the PostgreSQL DR replica. This field is meaningful for MySQL replicas (designating a same-region failover target); it is accepted but effectively a no-op for PostgreSQL cross-region replicas, which are promoted manually (e.g. via `gcloud sql instances promote-replica`). The accompanying comment "Set to true to promote during failover" is somewhat misleading for a PostgreSQL setup, but it is not a hard error and was left as-is to preserve author intent.
- The `db-n1-standard-2`/`db-n1-standard-4` tiers are legacy machine types but are still accepted by Cloud SQL. New deployments are increasingly steered toward custom or performance-optimized tiers, but this does not affect correctness.
- The `backup_configuration.location = "us"` value is valid (Cloud SQL accepts multi-region locations such as `us`, `eu`, `asia`, or specific region names).
- `rpo = "ASYNC_TURBO"` is correctly set on a dual-region bucket only — Turbo replication (≈15 min RPO) is unavailable on multi-region or single-region buckets, which matches the post's usage.
- The Cloud DNS `routing_policy.primary_backup` with `internal_load_balancers` requires the primary target to be a regional internal passthrough (or internal application) load balancer in the same network; this is consistent with `load_balancer_type = "regionalL4ilb"`.
- The example assumes supporting resources (`google_compute_forwarding_rule.primary`, `google_compute_forwarding_rule.dr`, `google_compute_network.vpc`, `google_service_account.backup_sa`, and `var.project_id`) are defined elsewhere; that is a reasonable abbreviation for a focused DR walkthrough.
