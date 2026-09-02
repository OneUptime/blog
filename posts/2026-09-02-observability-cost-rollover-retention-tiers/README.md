# How to Reduce OpenSearch Observability Costs with Rollover, Retention, and Tiered Storage

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenSearch, Observability, Index Management, Monitoring, Log Management

Description: Control observability storage and shard overhead with size-aware rollover, explicit retention, warm allocation, and selectively searchable snapshots.

---

OpenSearch observability cost is driven by more than raw bytes. Shards consume heap and cluster-manager resources; replicas multiply storage; indexing and queries consume CPU; long retention preserves expensive high-cardinality data. A useful lifecycle controls all four without making incident data unrecoverable.

Start by measuring, not guessing:

```http
GET _cat/indices/logs-*,otel-*,metrics-*?v&s=store.size:desc
GET _cat/shards/logs-*,otel-*,metrics-*?v&s=store:desc
GET _cluster/stats?human=true
```

Record daily primary-byte growth, primary shard sizes, query frequency by age, and recovery requirements for logs, spans, and metrics separately. They rarely deserve identical retention.

## Roll over on size as well as age

Daily indexes can be tiny on quiet services and enormous during incidents. Use data streams or a write alias and roll over when either an age or size threshold is reached. For a data stream:

```http
POST logs-app-prod/_rollover?dry_run=true
{
  "conditions": {
    "max_age": "1d",
    "max_size": "30gb"
  }
}
```

`max_size` is the combined size of the write index's primary shards; replicas are not counted. Choose the threshold from your workload and recovery tests. When rollover is driven by ISM, conditions are checked on the ISM job schedule, so the write index can grow beyond the threshold before the next evaluation.

Do not compensate for poor rollover with dozens of speculative primary shards. A shard that is too small wastes overhead; one that is too large slows movement and recovery.

## Encode retention in ISM

The following illustrative policy rolls over, moves older indexes to nodes carrying a `storage=warm` attribute, and deletes them after 30 days:

```http
PUT _plugins/_ism/policies/observability-30d
{
  "policy": {
    "description": "Rollover observability data, move it to warm nodes, delete at 30d",
    "default_state": "hot",
    "states": [
      {
        "name": "hot",
        "actions": [
          {
            "rollover": {
              "min_index_age": "1d",
              "min_primary_shard_size": "30gb"
            }
          }
        ],
        "transitions": [
          {"state_name": "warm", "conditions": {"min_index_age": "3d"}}
        ]
      },
      {
        "name": "warm",
        "actions": [
          {"replica_count": {"number_of_replicas": 1}},
          {"allocation": {"require": {"storage": "warm"}}}
        ],
        "transitions": [
          {"state_name": "delete", "conditions": {"min_index_age": "30d"}}
        ]
      },
      {
        "name": "delete",
        "actions": [{"delete": {}}],
        "transitions": []
      }
    ]
  }
}
```

Creating the policy does not by itself manage any index. Use a reviewed ISM template so future matching indexes are managed; use the Add Policy API for existing indexes, and verify the attachment with the ISM Explain API. If you associate a policy with an existing data stream, it applies to future backing indexes; audit existing backing indexes separately.

For a regular rollover alias, the initial index name must end in a hyphen followed by digits (for example, `logs-app-000001`) and be the alias's write index. Put `index.plugins.index_state_management.rollover_alias` in the matching index template so every new generation inherits it; setting it only on the bootstrap index can leave a later generation unable to roll over. Data streams infer rollover information, so do not add the alias setting to their backing indexes.

Policy age semantics deserve a test: the transitions above use `min_index_age`, which is measured from index creation and is not reset by rollover. Use `min_rollover_age` when transition timing should start after rollover. Use the ISM Explain API to confirm the effective state, action, and transition for representative indexes.

## Use real warm capacity

The allocation action above depends on node attributes such as:

```yaml
node.attr.storage: warm
```

Warm nodes can use lower-cost storage and fewer CPU resources when old data has a looser latency objective. Ensure enough warm nodes exist to satisfy replica and allocation-awareness rules; an impossible `require` expression leaves shards unassigned.

This attribute-based hot/warm design is separate from the OpenSearch `warm` node role used by searchable snapshots in OpenSearch 3.x.

## Consider searchable snapshots for rarely queried history

A searchable snapshot keeps authoritative index data in a snapshot repository and downloads segments into a warm-node cache on demand. It can reduce local storage, but searches are slower and object stores can charge per request. The index is inherently read-only.

```http
POST /_snapshot/observability-repository/logs-2026-08-01/_restore
{
  "storage_type": "remote_snapshot",
  "indices": "logs-app-2026.08.01"
}
```

OpenSearch 3.0+ requires nodes serving these shards to have the `warm` role. This is not an automatic replacement for a tested snapshot/restore plan, and a remote-data-to-cache ratio that is too high produces costly, slow investigations.

## Reduce data before retaining it

Lifecycle policy cannot rescue uncontrolled schemas. Additional savings come from:

- drop verbose health-check/debug events before indexing;
- sample traces intentionally while retaining errors and high-latency traces;
- avoid user/session/trace IDs as metric labels;
- map only fields that need search or aggregation;
- retain raw logs briefly and derived aggregates longer;
- use different policies per signal and environment.

Never reduce replicas below the availability objective just to hit a storage target. A snapshot is a recovery copy, while a replica provides online shard availability; they solve different problems.

## Validate cost and recoverability

After rollout, track primary and total bytes, shard count, query latency by tier, snapshot retrieval charges, ISM failures, and restore duration. Run an incident exercise that searches warm/remote history. A lifecycle that is cheap but cannot answer the required investigation within the response objective is not successful.

## Official References

- [OpenSearch ISM policies](https://docs.opensearch.org/latest/im-plugin/ism/policies/)
- [OpenSearch data streams and ISM](https://docs.opensearch.org/latest/im-plugin/data-streams/)
- [OpenSearch searchable snapshots](https://docs.opensearch.org/latest/tuning-your-cluster/availability-and-recovery/snapshots/searchable_snapshot/)
- [OpenSearch ISM Explain API](https://docs.opensearch.org/latest/im-plugin/ism/api/)
