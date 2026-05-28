# Validation Summary: How to Design Multi-Region Spanner Instances with Custom Leader Placement

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Spanner
- Spanner multi-region instance configurations
- Spanner custom instance configurations
- Spanner database default leader regions
- Google Cloud CLI (`gcloud`)
- GoogleSQL DDL
- Spanner system tables

## Sources Consulted
- Google Cloud Spanner regional, dual-region, and multi-region configuration documentation: https://docs.cloud.google.com/spanner/docs/instance-configurations
- Google Cloud Spanner create and manage instance configurations documentation: https://docs.cloud.google.com/spanner/docs/create-manage-configurations
- Google Cloud Spanner replication documentation: https://docs.cloud.google.com/spanner/docs/replication
- Google Cloud Spanner modify the leader region documentation: https://docs.cloud.google.com/spanner/docs/modifying-leader-region
- Google Cloud SDK `gcloud spanner instance-configs create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instance-configs/create
- Google Cloud SDK `gcloud spanner instances create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/instances/create
- Google Cloud SDK `gcloud spanner databases create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/spanner/databases/create
- Google Cloud Spanner transaction statistics documentation: https://docs.cloud.google.com/spanner/docs/introspection/transaction-statistics
- Google Cloud Spanner pricing documentation: https://cloud.google.com/spanner/pricing

## Issues Found
- The post claimed custom instance configurations can define arbitrary read-write and witness replicas and used a non-existent `--leader-region` flag. Updated the text and examples to explain that custom configurations can add optional read-only replicas to supported base configurations, while leader selection is handled with database default leader settings.
- The predefined configuration table had incorrect regions and leader regions for `nam14`, `nam-eur-asia1`, and `eur6`. Corrected the listed regions and default leader regions based on the current Spanner configuration table.
- Several `gcloud spanner instances create` examples used `--display-name`, but the current CLI requires `--description`. Updated those commands and added `--edition=ENTERPRISE_PLUS` for multi-region examples.
- Database creation examples used an unsupported `--default-leader` flag and PostgreSQL dialect DDL that did not match the CLI constraints. Replaced them with GoogleSQL `--ddl` examples using `ALTER DATABASE ... SET OPTIONS (default_leader = ...)`.
- The transaction statistics query referenced a non-existent `latency_seconds` column and used `APPROX_QUANTILES` over rows that do not represent per-request samples. Replaced it with documented `TXN_STATS_TOTAL_10MINUTE` columns and `SPANNER_SYS.DISTRIBUTION_PERCENTILE`.
- The read-only replica and cost explanations implied that read-only replicas always serve local reads and that users can manually choose witness replicas for cost optimization. Updated the wording to mention stale reads, base topology limits, and current pricing dimensions.
- The original quorum description simplified multi-region Spanner as a 2-of-3 vote. Updated it to describe the documented base multi-region quorum model with five voting replicas.

## Review Notes
The article remains a useful guide after correction, but the title still uses "custom leader placement" in a broad sense. In Spanner, the precise mechanism is choosing an eligible database default leader region within a base dual-region or multi-region configuration, not designing arbitrary leader topology.
