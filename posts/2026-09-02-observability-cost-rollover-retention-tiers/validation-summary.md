# Validation Summary: Reduce OpenSearch Costs with Rollover, Retention, and Tiers

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OpenSearch 3.x
- OpenSearch Index State Management (ISM)
- OpenSearch data streams and rollover aliases
- OpenSearch CAT Indices, CAT Shards, and Cluster Stats APIs
- Shard allocation filtering and custom node attributes
- Searchable snapshots and the `warm` node role
- Observability storage for logs, traces, and metrics

## Sources Consulted

- [OpenSearch Roll Over Index API](https://docs.opensearch.org/latest/api-reference/index-apis/rollover/)
- [OpenSearch 3.8.0 `RolloverRequest` implementation](https://github.com/opensearch-project/OpenSearch/blob/3.8.0/server/src/main/java/org/opensearch/action/admin/indices/rollover/RolloverRequest.java)
- [OpenSearch 3.8.0 rollover REST handler](https://github.com/opensearch-project/OpenSearch/blob/3.8.0/server/src/main/java/org/opensearch/rest/action/admin/indices/RestRolloverIndexAction.java)
- [OpenSearch ISM policies](https://docs.opensearch.org/latest/im-plugin/ism/policies/)
- [OpenSearch ISM API](https://docs.opensearch.org/latest/im-plugin/ism/api/)
- [OpenSearch data streams](https://docs.opensearch.org/latest/im-plugin/data-streams/)
- [OpenSearch CAT Indices API](https://docs.opensearch.org/latest/api-reference/cat/cat-indices/)
- [OpenSearch CAT Shards API](https://docs.opensearch.org/latest/api-reference/cat/cat-shards/)
- [OpenSearch Cluster Stats API](https://docs.opensearch.org/latest/api-reference/cluster-api/cluster-stats/)
- [OpenSearch shard allocation filtering](https://docs.opensearch.org/latest/api-reference/index-apis/shard-allocation/)
- [OpenSearch searchable snapshots](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/snapshots/searchable_snapshot/)
- [OpenSearch 3.0 breaking changes](https://docs.opensearch.org/3.0/breaking-changes/)
- [OpenSearch shard and replica concepts](https://docs.opensearch.org/latest/getting-started/intro/)
- [OpenSearch snapshot and restore](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/snapshots/snapshot-restore/)

## Issues Found

- The standard Rollover API example used `max_primary_shard_size`, which the current OpenSearch server does not accept. Changed it to the supported `max_size` condition and clarified that this measures the combined storage of all primary shards, excluding replicas. The later ISM policy correctly retains `min_primary_shard_size`, which is a separate ISM-supported condition.
- The text stated without qualification that rollover conditions are checked on the ISM job schedule, even though the preceding direct dry-run request evaluates its conditions immediately. Scoped the scheduling statement to rollover driven by ISM and changed the possible overshoot description from a single shard to the write index.
- The policy-attachment guidance presented an ISM template and the Add Policy API as interchangeable. Clarified that an ISM template manages future matching indexes, while the Add Policy API is for existing indexes; future data-stream backing indexes and existing backing indexes still need to be handled separately as documented.
- The rollover alias requirement said only that the initial index name must end in digits. Corrected it to require a hyphen followed by digits, matching ISM's `^.*-\d+$` requirement, and clarified that `rollover_alias` is an index setting that data-stream backing indexes do not need.
- The transition-age explanation was ambiguous about rollover resetting lifecycle age. Clarified that the shown `min_index_age` transitions are measured from index creation and are not reset by rollover, and identified `min_rollover_age` for timing a transition from rollover.

## Review Notes

- The ISM policy JSON and its `rollover`, `replica_count`, `allocation`, and `delete` actions are valid. Its warm and delete transitions occur at 3 and 30 days from index creation, respectively.
- The monitoring commands are valid, including comma-separated wildcard targets and the requested CAT sorting columns.
- The searchable-snapshot restore request, read-only behavior, cache model, latency and object-store cost caveats, and OpenSearch 3.0+ `warm` role requirement are correct. The example assumes that the repository is registered, the named snapshot exists, and no conflicting open index prevents restoration.
- The custom `storage=warm` allocation attribute is correctly distinguished from the OpenSearch 3.x `warm` node role used for searchable snapshots.
- All links in the post were reachable and pointed to the intended pages at review time.
