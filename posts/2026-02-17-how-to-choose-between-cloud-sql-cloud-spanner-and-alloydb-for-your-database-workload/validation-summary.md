# Validation Summary: How to Choose Between Cloud SQL Cloud Spanner and AlloyDB

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud SQL
- Cloud Spanner
- AlloyDB for PostgreSQL
- PostgreSQL
- MySQL
- SQL Server
- Google Cloud CLI
- Spanner GoogleSQL DDL
- AlloyDB columnar engine

## Sources Consulted
- Google Cloud CLI reference for `gcloud sql instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/sql/instances/create
- Cloud SQL for PostgreSQL machine series overview: https://docs.cloud.google.com/sql/docs/postgres/machine-series-overview
- Cloud SQL for PostgreSQL storage options: https://docs.cloud.google.com/sql/docs/postgres/storage-options-overview
- Cloud SQL SLA: https://cloud.google.com/sql/sla
- Google Cloud CLI reference for `gcloud spanner instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- Spanner instances overview: https://docs.cloud.google.com/spanner/docs/instances
- Spanner managed autoscaler documentation: https://docs.cloud.google.com/spanner/docs/managed-autoscaler
- Spanner regional, dual-region, and multi-region configurations: https://cloud.google.com/spanner/docs/instance-configurations
- Spanner pricing: https://cloud.google.com/spanner/pricing
- Google Cloud CLI reference for `gcloud alloydb clusters create`: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/clusters/create
- Google Cloud CLI reference for `gcloud alloydb instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/alloydb/instances/create
- AlloyDB overview: https://cloud.google.com/alloydb/docs/overview
- AlloyDB create primary instance documentation: https://cloud.google.com/alloydb/docs/instance-primary-create
- AlloyDB columnar engine overview and configuration: https://docs.cloud.google.com/alloydb/docs/columnar-engine/about and https://docs.cloud.google.com/alloydb/docs/columnar-engine/configure
- AlloyDB manual column store management: https://docs.cloud.google.com/alloydb/docs/columnar-engine/manage-content-manually
- AlloyDB quotas and limits: https://docs.cloud.google.com/alloydb/quotas

## Issues Found
- The Cloud SQL command used `--storage-size=100GB`. The gcloud reference defines `--storage-size` as a storage size value, and examples use numeric size values, so I changed it to `--storage-size=100`.
- The Spanner limitations section gave an outdated fixed regional node-hour price. Spanner now uses editions and granular instances below one node, so I changed the wording to describe node-hour pricing without a stale exact figure.
- The post said AlloyDB has no free tier. AlloyDB documentation lists free trial clusters, so I changed the limitation to clarify that free trials exist while paid clusters still start larger than Cloud SQL's smallest tiers.
- The AlloyDB columnar engine SQL example used `ALTER TABLE ... SET (google_columnar_engine.enabled = true)`, which is not the documented way to manage column store contents. I replaced it with `google_columnar_engine_add(...)` and clarified that the engine is enabled at the instance flag level.
- The comparison table said Spanner can scale to zero with autoscaler. Spanner managed autoscaler scales down to a configured minimum, not zero, so I corrected the entry.
- The availability SLA table listed only one Cloud SQL SLA and only multi-region Spanner wording. I updated it to mention Cloud SQL's edition/HA-dependent SLA and Spanner's dual-region or multi-region 99.999% SLA.
- The Spanner starting monthly cost used a one-node assumption as though it were the minimum. I updated it to a lower starting point for a small regional granular instance.
- The connection method row said AlloyDB uses the Cloud SQL Proxy. AlloyDB uses the AlloyDB Auth Proxy, so I corrected that row and named the Cloud SQL Auth Proxy explicitly.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud CLI reference instead of local `--help` output. Pricing remains approximate and region/edition-dependent; future revisions should avoid hard-coded monthly prices where possible.
