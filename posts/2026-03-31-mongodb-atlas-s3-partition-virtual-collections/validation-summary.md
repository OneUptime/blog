# Validation Summary: How to Map S3 Partitions to Virtual Collections in Atlas Data Federation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- MongoDB Atlas Data Federation
- Amazon S3
- Hive-style partitioning
- MQL (MongoDB Query Language)

## Sources Consulted
- MongoDB Atlas Data Federation documentation: Define Data Stores for a Federated Database Instance (https://www.mongodb.com/docs/atlas/data-federation/config/config-data-store/)
- MongoDB Atlas Data Federation documentation: Partition Attributes (https://www.mongodb.com/docs/atlas/data-federation/supported-unsupported/partition-attributes/)
- MongoDB Atlas Data Federation documentation: Storage Configuration (https://www.mongodb.com/docs/atlas/data-federation/config/)

## Issues Found
1. **Typed partition attribute syntax used space instead of colon separator.** The post used `{partitionName int}` and path examples like `{year int}`, `{month int}`, `{day int}`. The correct Atlas Data Federation syntax for typed partition attributes requires a colon separator: `{partitionName : int}`. Fixed the inline description and the JSON path example to use `{year : int}`, `{month : int}`, `{day : int}`.

## Review Notes
- The storage configuration JSON structure (databases, collections, dataSources, stores) is accurate for Atlas Data Federation.
- The `{attribute}` placeholder syntax for string partition fields is correct.
- The use of `*` as a wildcard segment in paths is correct.
- The `defaultFormat` values `.json` and `.json.gz` are valid formats.
- The explain approach for verifying partition pushdown is conceptually correct, though exact output field names (e.g., `partitionFilterApplied`) may vary by version and are not guaranteed to match precisely.
- The description in the "Wildcard Partition Segments" section states "accepting any path structure at the `{region}` level" which is slightly misleading since `{region}` is a captured partition field (not a true wildcard like `*`), but the technical behavior described is correct.
