# Validation Summary: Fix Geode `TransactionDataNotColocatedException` with Colocated Keys

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- Apache Geode transactions
- Apache Geode partitioned and replicated regions
- Partition resolvers and cross-region data colocation
- Java and the Geode `CacheTransactionManager` API
- Geode `gfsh` region-management commands
- Partitioned-region rebalancing, recovery, redundancy, and persistence

## Sources Consulted

- Apache Geode `TransactionDataNotColocatedException` Java API: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/TransactionDataNotColocatedException.html
- Apache Geode `CacheTransactionManager` Java API: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/CacheTransactionManager.html
- Apache Geode `TransactionDataRebalancedException` Java API: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/TransactionDataRebalancedException.html
- Apache Geode `TransactionInDoubtException` Java API: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/TransactionInDoubtException.html
- Apache Geode transaction design considerations: https://geode.apache.org/docs/guide/latest/developing/transactions/design_considerations.html
- Apache Geode adherence to ACID promises: https://geode.apache.org/docs/guide/latest/developing/transactions/transactions_intro.html
- Apache Geode `PartitionResolver` Java API: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/PartitionResolver.html
- Apache Geode `StringPrefixPartitionResolver` Java API: https://geode.apache.org/releases/latest/javadoc/org/apache/geode/cache/util/StringPrefixPartitionResolver.html
- Apache Geode custom partition-resolver guide: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/using_custom_partition_resolvers.html
- Apache Geode cross-region colocation guide: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/colocating_partitioned_region_data.html
- Apache Geode `gfsh create` command reference: https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/create.html
- Apache Geode `gfsh describe` command reference: https://geode.apache.org/docs/guide/latest/tools_modules/gfsh/command-pages/describe.html
- Apache Geode bucket-count configuration guide: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/configuring_bucket_for_pr.html
- Apache Geode partitioned-region rebalancing guide: https://geode.apache.org/docs/guide/latest/developing/partitioned_regions/rebalancing_pr_data.html
- Apache Geode 2.0.x source and tests: https://github.com/apache/geode/tree/rel/v2.0.2

## Issues Found

- The opening said that the first partitioned-region operation anchors the transaction. The transaction host is selected by the first transactional region operation, so an earlier replicated-region operation can already select an incompatible host. The text now states that a hosted transaction is anchored by its first region operation and that this operation must be on a partitioned region when region types are mixed.
- The deployment guidance mentioned only data members. A partition resolver must be available to every member that defines the partitioned region, including accessors. The guidance now includes those members explicitly.
- The constant-resolver warning claimed that returning a constant avoids `TransactionDataNotColocatedException` generally. It only prevents key-based cross-bucket placement within that region; it does not repair missing cross-region colocation or prevent topology-movement failures. The warning was narrowed accordingly while retaining the hotspot warning.
- The verification checklist implied that `describe region` displays every partition attribute. It reports non-default attributes, so the checklist now tells readers to verify omitted settings against their documented defaults.
- The migration paragraph implied that every resolver correction requires new keys. Keys only need transformation when the key scheme changes, so that step is now conditional.

## Review Notes

- All six links in the post's Official Documentation section returned HTTP 200 and pointed to the intended Apache Geode pages on 2026-09-01.
- The `gfsh create region` options and values are valid for Geode 2.0, including `PARTITION` with `--redundant-copies=1`, `--total-num-buckets`, `--partition-resolver`, and `--colocated-with=Customers`.
- The custom resolver uses current, non-deprecated `PartitionResolver<K, V>` and `EntryOperation<K, V>` signatures. Its syntax was checked with JDK 17 and `geode-core` 2.0.0; its implicit public zero-argument constructor and stateless implementation satisfy the documented Java single-hop requirements.
- The one-host routing guidance is explicitly about the hosted transaction mode that produces `TransactionDataNotColocatedException`; Geode also exposes distributed transaction mode through `CacheTransactionManager.setDistributed(boolean)`.
- The post does not claim support for a specific Geode release. The reviewed APIs and commands remain current in the Geode 2.0 documentation and official 2.0.x source.
