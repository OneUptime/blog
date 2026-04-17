# Validation Summary: ClickHouse Cloud vs Open Source Feature Comparison

## Status
validated

## Post Type
Comparison / Reference guide

## Technologies Covered
- ClickHouse (open source)
- ClickHouse Cloud (managed service)
- ClickHouse Keeper (coordination service)
- MergeTree table engines
- S3 object storage tiering
- AWS PrivateLink / GCP Private Service Connect / Azure Private Link
- Prometheus + Grafana monitoring stack

## Sources Consulted
- [ClickHouse Cloud Pricing Documentation](https://clickhouse.com/docs/cloud/manage/billing/overview)
- [ClickHouse Pricing Page](https://clickhouse.com/pricing)
- ClickHouse release notes for query cache (introduced in v23.1)
- ClickHouse Cloud documentation on compute-storage separation and tiered storage
- ClickHouse Keeper documentation (replacement for ZooKeeper coordination)

## Issues Found
- **CHU abbreviation inaccuracy**: The post referenced ClickHouse Cloud's pricing as "pay per compute unit (CHU) consumed". While ClickHouse Cloud does bill per "compute unit", the acronym "CHU" is not an official or recognized abbreviation in ClickHouse Cloud documentation. Removed the parenthetical `(CHU)` to avoid introducing a non-standard term. The concept (compute unit = 8 GiB RAM + 2 vCPU, billed per minute) remains accurate as described in the cost model section.

## Review Notes
- All feature comparisons in the feature matrix are accurate for current ClickHouse Cloud and open source offerings.
- Query cache is correctly listed as available in both; it was introduced in open source ClickHouse 23.1 (January 2023).
- Compute-storage separation description is accurate: ClickHouse Cloud uses S3 as the primary store and decouples stateless compute nodes from it.
- PITR (Point-in-Time Recovery) claim for ClickHouse Cloud backups is accurate.
- Private Link support on AWS, GCP, and Azure is correctly listed as a native cloud feature.
- Idle-pause / auto-pause behavior described in the cost section is accurate for the Basic/Scale tiers.
- Example pricing figures ($200-400/mo compute, ~$20/mo storage) are illustrative and reasonable based on current ClickHouse Cloud rates (~$0.22-0.39 per compute unit-hour and ~$25.30/TB-month storage). Readers should be aware these numbers shift with usage patterns and tier selection.
- The `bash` code fence around the "Self-hosted: manual tasks" list contains a bulleted prose list rather than actual shell commands; this is cosmetic and not a technical error, so no change was made.
