# Validation Summary: How to Optimize Query Performance and Caching in Azure Data Explorer

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Azure Data Explorer
- Kusto Query Language (KQL)
- Kusto management commands
- ADX caching policies
- ADX retention policies
- ADX partitioning policies
- ADX materialized views
- ADX query diagnostics
- ADX extents and merge policies

## Sources Consulted
- Microsoft Learn: Caching policy (hot and cold cache): https://learn.microsoft.com/en-us/kusto/management/cache-policy?view=microsoft-fabric
- Microsoft Learn: .alter table policy caching command: https://learn.microsoft.com/en-us/kusto/management/alter-table-cache-policy-command?view=microsoft-fabric
- Microsoft Learn: .alter database policy caching command: https://learn.microsoft.com/en-us/kusto/management/alter-database-cache-policy-command?view=microsoft-fabric
- Microsoft Learn: Extents (data shards): https://learn.microsoft.com/en-us/kusto/management/extents-overview?view=microsoft-fabric
- Microsoft Learn: String operators: https://learn.microsoft.com/en-us/azure/kusto/query/datatypes-string-operators
- Microsoft Learn: KQL best practices: https://learn.microsoft.com/en-us/kusto/query/best-practices?view=microsoft-fabric
- Microsoft Learn: dcount() aggregation function: https://learn.microsoft.com/en-us/kusto/query/dcount-aggregation-function?view=microsoft-fabric
- Microsoft Learn: .create materialized-view: https://learn.microsoft.com/en-us/kusto/management/materialized-views/materialized-view-create?view=microsoft-fabric
- Microsoft Learn: .show materialized-view(s): https://learn.microsoft.com/en-us/kusto/management/materialized-views/materialized-view-show-command?view=microsoft-fabric
- Microsoft Learn: .show materialized view details: https://learn.microsoft.com/en-us/kusto/management/materialized-views/materialized-view-show-details-command?view=microsoft-fabric
- Microsoft Learn: .show materialized-view extents: https://learn.microsoft.com/en-us/kusto/management/materialized-views/materialized-view-show-extents-command?view=microsoft-fabric
- Microsoft Learn: Partitioning policy: https://learn.microsoft.com/en-us/kusto/management/partitioning-policy?view=microsoft-fabric
- Microsoft Learn: Ingest historical data into Azure Data Explorer: https://learn.microsoft.com/en-us/azure/data-explorer/ingest-data-historical
- Microsoft Learn: .show queries command: https://learn.microsoft.com/en-us/kusto/management/show-queries-command?view=azure-data-explorer
- Microsoft Learn: Azure Data Explorer web UI query overview: https://learn.microsoft.com/en-us/azure/data-explorer/web-ui-query-overview
- Microsoft Learn: .show extents: https://learn.microsoft.com/en-us/kusto/management/show-extents?view=microsoft-fabric
- Microsoft Learn: Retention policy: https://learn.microsoft.com/en-us/kusto/management/retention-policy?view=microsoft-fabric
- Microsoft Learn: Extents merge policy: https://learn.microsoft.com/en-us/kusto/management/merge-policy?view=microsoft-fabric

## Issues Found
- Replaced "missing indexes" with "inefficient use of indexes" because ADX builds indexes automatically and query performance issues usually come from query patterns and schema/design choices rather than omitted user-created indexes.
- Corrected the extent metadata description. Official docs describe extent metadata such as creation time and optional tags; they do not describe per-column min/max metadata as a general user-facing extent feature.
- Added cache sizing nuance. ADX uses local SSD cache management and prioritizes recent hot data when cache space is constrained, so the post should not imply a simple exact 500 GB requirement without headroom.
- Narrowed the time-filter explanation. ADX tracks extent creation time for caching and retention, and time filtering is most effective when the queried timestamp aligns with ingestion or creation time.
- Corrected the `dcount()` guidance. `dcount()` is already approximate; `hll()` is not a direct replacement for ordinary approximate distinct counting.
- Replaced invalid materialized-view health commands. `.show materialized-view <name> statistics` is not the documented command; the post now uses `.show materialized-view <name>` and `.show materialized-view <name> details`.
- Fixed the partitioning policy command. The original JSON used incorrect property names such as `partitionBy`, `column`, and `kind`; it now uses documented `PartitionKeys`, `ColumnName`, `Kind`, `Properties`, and `EffectiveDateTime` fields.
- Corrected partitioning recommendations. Hash partitioning is recommended for equality filters, joins, or aggregations on high-cardinality string/GUID keys under heavy concurrent query load, not merely moderate-cardinality columns.
- Corrected the `.show queries` projection from `TotalCPU` to the documented case-sensitive `TotalCpu` column name.
- Removed the incorrect `explain` usage. Official Kusto docs describe `explain` as SQL-to-KQL translation, while ADX query statistics are available after query execution in the web UI.
- Removed unsafe merge-policy tuning advice. Microsoft documents that `MaxExtentsToMerge` should not be changed and warns users to consult support before altering extents merge policy.

## Review Notes
The remaining examples are illustrative and assume table names, columns, and permissions exist in the reader's ADX environment. Commands that alter policies require the relevant database or table admin permissions.
