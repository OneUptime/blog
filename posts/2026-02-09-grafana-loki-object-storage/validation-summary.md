# Validation Summary: How to configure Grafana Loki with object storage backend

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Grafana Loki
- Loki TSDB storage schema
- Amazon S3 and S3-compatible object storage
- MinIO
- Google Cloud Storage
- Kubernetes service accounts / IAM roles
- Prometheus / PromQL monitoring queries
- Docker Compose

## Sources Consulted
- Grafana Loki storage documentation: https://grafana.com/docs/loki/latest/configure/storage/
- Grafana Loki configuration examples: https://grafana.com/docs/loki/latest/configure/examples/configuration-examples/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki log retention documentation: https://grafana.com/docs/loki/latest/operations/storage/retention/
- Grafana Loki architecture documentation: https://grafana.com/docs/loki/latest/fundamentals/architecture/
- Grafana Loki multi-tenancy documentation: https://grafana.com/docs/loki/latest/operations/multi-tenancy/
- Grafana Loki key metrics documentation: https://grafana.com/docs/enterprise-logs/latest/manage/meta-monitoring/metrics/
- Grafana Loki v3.7.2 release page: https://github.com/grafana/loki/releases/tag/v3.7.2
- Local validation with `grafana/loki:3.7.2 -verify-config`

## Issues Found
- Removed obsolete `tsdb_shipper.shared_store` and `compactor.shared_store` examples. Current Loki v3.7 config derives the shared object store from the schema `object_store`, and these fields are no longer in the current config reference.
- Added `compactor.delete_request_store: s3` to the retention example because Loki retention requires a delete request store when retention is enabled.
- Updated Loki image examples from `grafana/loki:2.9.0` to `grafana/loki:3.7.2`, the current release checked during review.
- Corrected the storage architecture description. Recent index entries do not generally live in a separate database with TSDB single-store; active data is local while being built and then shipped/flushed to object storage.
- Added the `-config.expand-env=true` caveat for environment variable expansion in Loki YAML.
- Replaced the old FIFO cache examples with current `embedded_cache` blocks and verified them with Loki v3.7.2.
- Corrected the S3 server-side encryption example from the old `sse_encryption` style to the current `sse.type` structure.
- Clarified MinIO settings: `s3forcepathstyle` is commonly required, while `insecure: true` is only appropriate for plain HTTP or disabled TLS verification.
- Corrected the multi-tenancy explanation. Single-tenant Loki uses tenant ID `fake`; multi-tenant Loki uses the `X-Scope-OrgID` tenant ID rather than a fixed `fake/tenant-id` path.
- Replaced misleading or undocumented monitoring queries with documented Loki request and compactor health metrics.
- Corrected the compression best practice. Current Loki defaults to compressed chunks and supports configurable `ingester.chunk_encoding`; the post should not claim Snappy or LZ4 are the default.
- Clarified S3 lifecycle guidance because moving queryable Loki chunks to archival tiers such as Glacier can make old logs slow or unavailable to query.
- Added missing `storage_config` backends to the filesystem-to-S3 migration example.

## Review Notes
Representative Loki configs for filesystem storage, S3 retention, and cache/ingester tuning were validated with `grafana/loki:3.7.2 -verify-config`. Partial Kubernetes and credential snippets were reviewed against official configuration references but were not applied to a live cluster.
