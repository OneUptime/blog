# Validation Summary: ClickHouse Cloud vs Self-Hosted: Cost and Performance Analysis

## Status
validated

## Post Type
Guide

## Technologies Covered
- ClickHouse
- ClickHouse Cloud
- Self-hosted ClickHouse deployments
- ClickPipes
- Kafka ingestion
- ClickHouse dictionaries
- ClickHouse user-defined functions
- ClickHouse TLS configuration

## Sources Consulted
- ClickHouse Cloud billing overview: https://clickhouse.com/docs/cloud/manage/billing/overview
- ClickHouse Cloud tiers: https://clickhouse.com/docs/cloud/manage/cloud-tiers
- ClickHouse Cloud compatibility: https://clickhouse.com/docs/whats-new/cloud-compatibility
- ClickHouse Kafka table engine: https://clickhouse.com/docs/engines/table-engines/integrations/kafka
- ClickHouse Cloud user-defined functions: https://clickhouse.com/docs/cloud/features/user-defined-functions
- ClickHouse Cloud backups: https://clickhouse.com/docs/cloud/manage/backups/overview
- ClickHouse Cloud IP filters: https://clickhouse.com/docs/cloud/security/setting-ip-filters
- ClickHouse Cloud private networking: https://clickhouse.com/docs/cloud/security/connectivity/private-networking
- ClickHouse Cloud compliance overview: https://clickhouse.com/docs/cloud/security/compliance-overview
- ClickHouse server settings for OpenSSL/TLS: https://clickhouse.com/docs/operations/server-configuration-parameters/settings
- ClickHouse TLS configuration guide: https://clickhouse.com/docs/guides/sre/tls/configuring-tls

## Issues Found
- Updated the ClickHouse Cloud storage cost row to include default backup storage. The official billing documentation states storage and backups are counted toward storage costs, and the current AWS example lists 10 TB plus one backup at about $506/month.
- Replaced the fixed "1-5 seconds" cold-start claim with wording tied to idle scaling settings, because ClickHouse Cloud exposes idle scaling behavior and timeout configuration rather than a universal startup time.
- Clarified high-concurrency and scaling rows so they do not imply every ClickHouse Cloud tier scales automatically. The official tier documentation states Basic services do not scale, while Scale and Enterprise provide flexible scaling options.
- Changed the feature comparison entry that said ClickHouse Cloud has no Kafka engine. Official docs recommend ClickPipes for Kafka ingestion on ClickHouse Cloud, but do not support the blanket "no Kafka engine" claim.
- Corrected the dictionaries row. ClickHouse Cloud compatibility docs list supported dictionary sources including PostgreSQL, MySQL, ClickHouse, Redis, MongoDB, and HTTP, so "table-based only" was inaccurate.
- Clarified the UDF row to distinguish SQL UDF support from executable UDF support in Cloud UI/beta.
- Changed "Point-in-time recovery" to "Backup restore" because the official ClickHouse Cloud backup documentation describes scheduled backups, restore to a new service, and UNDROP support, not general point-in-time recovery.
- Changed the self-hosted scaling snippet language from `bash` to `text`, since the block is a numbered operational process rather than executable shell.

## Review Notes
The cost tables remain illustrative estimates. ClickHouse Cloud pricing varies by tier, provider, region, replica sizing, backup retention, egress, and idle scaling configuration, so production decisions should use the current ClickHouse pricing calculator and measured workload data.
