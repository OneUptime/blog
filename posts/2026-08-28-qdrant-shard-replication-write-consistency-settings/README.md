# How to Choose Qdrant Shard, Replication, and Write-Consistency Settings

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Qdrant, Distributed System, Sharding, Replication, Consistency

Description: Size Qdrant shards and replicas deliberately, then choose write ordering and read/write consistency for explicit failure tradeoffs.

---

Qdrant's shard, replica, and consistency settings control different things:

- `shard_number` divides a collection's points for horizontal distribution and parallel work.
- `replication_factor` controls how many physical copies exist for each logical shard.
- `write_consistency_factor` controls how many replicas must acknowledge a write before Qdrant reports success.
- Per-request `ordering` controls whether concurrent writes may be reordered.
- Per-request read `consistency` controls how many replica results a read requires and how their answers are resolved.

Increasing one setting does not substitute for another. In particular, a high write consistency factor does not serialize concurrent updates, and `wait=true` does not turn a one-replica collection into a replicated one.

## Prerequisites

Before creating or changing a distributed collection:

- Confirm the Qdrant server version and whether the deployment is self-hosted, Qdrant Cloud, Hybrid Cloud, or Private Cloud.
- Record node count, failure domains, available disk, memory, and network bandwidth.
- Measure collection size, vector dimensions, write rate, read rate, and expected growth.
- Define the failures the service must tolerate and the availability it must preserve during them.
- Use stable point IDs and make ingestion retries idempotent.
- Verify snapshots and recovery procedures before changing topology.

The examples use:

```bash
export QDRANT_URL='http://localhost:6333'
export QDRANT_API_KEY='replace-with-an-admin-key'
```

Use TLS outside a trusted local network.

## Keep the Controls Separate

| Control | Scope | What it changes | What it does not guarantee |
|---|---|---|---|
| `shard_number` | Collection | Logical partitions and distribution opportunities | Extra copies or write acknowledgement |
| `replication_factor` | Collection | Physical copies of every logical shard | How many copies must accept a particular write |
| `write_consistency_factor` | Collection | Minimum replica acknowledgements for write success | A single global write order |
| `wait` | Write request | Whether the response waits for processing instead of only receipt | Extra replication or concurrent-write serialization |
| `ordering` | Write request | Weak, medium, or strong serialization behavior | Read reconciliation by itself |
| `consistency` | Read request | Required replica results and their resolution | More stored replicas |

Choose the physical topology first, then choose request guarantees that fit its failure budget.

## Choose the Automatic Shard Count

For the default automatic sharding method, `shard_number` is the total number of logical shards in the collection. Qdrant distributes their replicas among cluster peers.

With Qdrant's built-in collection defaults, omitting the value uses one shard for a standalone node and, in a cluster, the number of nodes present when the collection is created. The self-hosted shard count cannot be changed without recreating the collection. Qdrant Cloud supports resharding on multi-node clusters, including Hybrid and Private Cloud, but a large reshard can take a long time.

Current Qdrant guidance recommends at least two shards per node as a starting point when future horizontal growth is expected. Twelve shards is a common growth-oriented starting point because it divides evenly across 1, 2, 3, 6, and 12 nodes. These are planning heuristics, not universal targets. More shards consume resources and add coordination overhead.

Choose fewer shards when the collection is small and stable. Choose enough shards to distribute expected data and work across the largest planned cluster without immediately recreating the collection. Validate the choice with production-shaped load tests.

## Do Not Misread `shard_number` with Custom Sharding

With `sharding_method: "custom"`, the meaning changes: `shard_number` is the number of shards per shard key, not the total for the collection.

For example:

```json
{
  "sharding_method": "custom",
  "shard_number": 1,
  "replication_factor": 2
}
```

Ten shard keys produce `10 x 1 x 2 = 20` physical shard replicas. Custom sharding is therefore intended for low-cardinality routing keys, such as a limited set of large tenants or regions. It is not a replacement for a high-cardinality tenant payload index.

Applications must pass the correct `shard_key` to target specific custom shards. Operations that omit it execute on all shards. Qdrant also warns against using the same point ID in different shard keys, even though current uniqueness enforcement is local to each key.

## Choose the Replication Factor from the Failure Requirement

`replication_factor` is the number of physical copies for every logical shard. The built-in default is one, which means no automatically maintained extra copy.

A replication factor of two lets a shard retain another copy when one replica fails, provided the replicas are placed on distinct surviving nodes. It approximately doubles the collection's shard storage and increases write and recovery work. A larger factor costs more again.

Qdrant's high-availability guidance calls for at least three voting nodes and a replication factor of at least two. Three nodes are needed so the Raft metadata consensus can retain a majority when one node fails. Raft protects cluster topology and collection structure; point writes do not pass through Raft.

Replication factor can also increase read capacity because any active replica can serve reads. Qdrant has no normal primary/secondary replica split. A leader is introduced only for `medium` or `strong` write ordering to serialize writes. Self-hosted traffic must actually be distributed across peers-normally through a load balancer-to use that read capacity; Qdrant clients do not automatically load-balance requests across cluster nodes.

## Choose the Write Consistency Factor Separately

`write_consistency_factor` ranges from one through `replication_factor`; its built-in default is one. It is the number of replicas that must acknowledge a write before the operation is reported as successful.

For a replication factor of two:

- `write_consistency_factor: 1` preserves more write availability when only one replica is active, but a recovered replica may require more synchronization.
- `write_consistency_factor: 2` rejects a write unless both copies acknowledge it, avoiding successful unreplicated writes at the cost of availability during a replica outage.

If too few replicas are active, Qdrant rejects the write. If an operation cannot reach the required acknowledgement count, the returned error can still represent a partially applied write. Retry the same idempotent operation with the same point IDs, and reconcile from the durable source of truth.

Do not generate new IDs on every retry. An upsert with a new ID creates another point instead of completing the uncertain original write.

## Create an Automatic-Sharded Replicated Collection

Run this example against a distributed cluster with at least two peers; Qdrant does not place two replicas of the same shard on one node. It creates six logical shards, two copies of each shard, and requires both copies to acknowledge writes:

```bash
curl -fsS -X PUT "$QDRANT_URL/collections/documents" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 3,
      "distance": "Cosine"
    },
    "shard_number": 6,
    "replication_factor": 2,
    "write_consistency_factor": 2
  }'
```

The same operation with the Python client is:

```python
import os

from qdrant_client import QdrantClient, models

client = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ.get("QDRANT_API_KEY"),
)

client.create_collection(
    collection_name="documents",
    vectors_config=models.VectorParams(
        size=3,
        distance=models.Distance.COSINE,
    ),
    shard_number=6,
    replication_factor=2,
    write_consistency_factor=2,
)
```

With at least two peers available, six logical shards at replication factor two create twelve physical shard replicas. Confirm the cluster has capacity for the vectors, payloads, indexes, snapshots, write-ahead logs, and rebuild headroom before creating them.

## Add Write Ordering Only Where Needed

Qdrant exposes three per-request ordering levels:

- `weak` is the default. It adds no ordering guarantee, so writes may be reordered.
- `medium` routes writes through a dynamically selected leader. A leader change can cause a short inconsistency.
- `strong` routes writes through a permanent leader. It provides strong ordering but writes may be unavailable while that leader is down.

Use the same non-weak ordering level for every competing change to a logical point when replicas must observe those writes in one consistent processing order. Ordering does not inspect payload revision values or enforce application-level version precedence. It costs latency and availability, so do not enable `strong` globally merely because the collection is replicated.

REST example:

```bash
curl -fsS -X PUT \
  "$QDRANT_URL/collections/documents/points?wait=true&ordering=strong" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "points": [
      {
        "id": 101,
        "vector": [0.1, 0.2, 0.3],
        "payload": {"revision": 7}
      }
    ]
  }'
```

The three-dimensional vector is illustrative.

Python example:

```python
client.upsert(
    collection_name="documents",
    points=[
        models.PointStruct(
            id=101,
            vector=[0.1, 0.2, 0.3],
            payload={"revision": 7},
        )
    ],
    wait=True,
    ordering=models.WriteOrdering.STRONG,
)
```

`wait=True` asks Qdrant to return after the changes are applied rather than immediately after receipt. The collection's write consistency factor still controls how many replicas must acknowledge success.

## Choose Read Consistency per Request

Without an explicit read consistency, Qdrant requires one replica result. Current read options are:

- An integer `N`: require results from `N` replicas and return points present on all of them. Values above the shard's replica-set size are capped at that size.
- `quorum`: require results from a majority of replicas and return points present on all of them.
- `majority`: query all replicas and return points present on a majority.
- `all`: query all replicas and return points present on all of them.

Requiring more replica results can reduce the chance of observing a replica disagreement, but it costs latency and availability. It is not automatically required for every search workload.

REST Query API example:

```bash
curl -fsS -X POST \
  "$QDRANT_URL/collections/documents/points/query?consistency=majority" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "query": [0.1, 0.2, 0.3],
    "limit": 10,
    "params": {
      "exact": false,
      "hnsw_ef": 128
    }
  }'
```

Python example:

```python
hits = client.query_points(
    collection_name="documents",
    query=[0.1, 0.2, 0.3],
    limit=10,
    consistency="majority",
)
```

Select stronger read consistency for paths where concurrent updates or a recently recovered replica make disagreement unacceptable. Keep default consistency for latency-sensitive searches that tolerate Qdrant's availability-first default.

## A Practical Decision Matrix

| Requirement | Starting configuration | Important caveat |
|---|---|---|
| Single-node development | 1 shard, replication 1, write consistency 1 | No node-failure tolerance |
| Three-node production, tolerate one node failure | Enough automatic shards to use all nodes, replication 2 | RF 2 retains a copy; continued writes during replica loss require WCF 1, while WCF 2 rejects them |
| Never report an unreplicated write as successful with RF 2 | Write consistency 2 | Writes fail when fewer than two replicas can acknowledge |
| High write availability during one replica outage | Write consistency 1 | Recovered copies may need synchronization |
| Concurrent same-point updates must be ordered | `strong` on every competing write | Ordering does not compare payload revisions; `strong` can become unavailable with its leader |
| Reads must reconcile replica disagreement | `majority`, `quorum`, `all`, or integer `N` from 2 through the replica-set size | More fan-out increases latency and failure sensitivity |
| Large tenant or region routing | Custom sharding with low-cardinality shard keys | `shard_number` is per key and unscoped requests fan out |

Treat this table as a test starting point, not a substitute for failure drills.

## Verify the Effective Configuration

Read the collection configuration:

```bash
curl -fsS \
  -H "api-key: $QDRANT_API_KEY" \
  "$QDRANT_URL/collections/documents" |
  jq '.result.config.params | {
    shard_number,
    sharding_method,
    replication_factor,
    write_consistency_factor
  }'
```

Then inspect shard placement and replica state:

```bash
curl -fsS \
  -H "api-key: $QDRANT_API_KEY" \
  "$QDRANT_URL/collections/documents/cluster" |
  jq '.result'
```

Verify that every logical shard has the expected number of active replicas on the intended peers. Also check cluster consensus status before interpreting a collection result as healthy.

Run controlled drills:

1. Stop one replica-hosting node.
2. Test writes at the chosen write consistency factor.
3. Test reads at default, majority, quorum, and all consistency where applicable.
4. Restore the node and watch replica recovery to active state.
5. Repeat concurrent same-point writes under the selected ordering.
6. Reconcile final point versions and payloads against the source of truth.

Do not perform the first failure drill on the only production copy of unverified data.

## Change and Rollback Cautions

Automatic shard count is difficult to change. Self-hosted Qdrant generally requires a new collection and data migration; resharding is available on multi-node Qdrant Cloud clusters, including Hybrid and Private Cloud, and can be lengthy.

Changing `replication_factor` after collection creation behaves differently by deployment. Qdrant Cloud variants automatically create or remove replicas to match it. In current self-hosted open-source Qdrant, updating the collection-level value does not itself create or remove physical replicas; use the cluster setup API to manage them.

Lowering write consistency or read consistency restores availability but weakens the guarantee. Record why the temporary change was made, reconcile partially applied operations, and restore the intended setting after recovery.

Never interpret a timed-out or failed distributed write as proof that nothing changed. Retry idempotently and verify the final state.

## Version Scope and Limitations

- Current shard-count defaults depend on whether the collection is created on a standalone node or a cluster.
- Resharding is documented from Qdrant 1.13 for multi-node Qdrant Cloud, Hybrid Cloud, and Private Cloud clusters; it is not available in self-hosted open source.
- Custom sharding is available from Qdrant 1.7.
- Replica-factor reconciliation after a configuration update differs between Qdrant Cloud variants and self-hosted open source.
- Some shard-transfer methods can affect ordering guarantees; review the current transfer documentation before topology work.
- Three voting nodes protect Raft metadata availability. That does not by itself replicate point data; the collection also needs replicas.

## Official Documentation

- [Qdrant Consistency Guarantees](https://qdrant.tech/documentation/scaling/consistency-guarantees/)
- [Qdrant Distributed Deployment](https://qdrant.tech/documentation/scaling/distributed_deployment/)
- [Qdrant Horizontal Scaling](https://qdrant.tech/documentation/scaling/horizontal-scaling/)
- [Qdrant Scaling and Resilience Overview](https://qdrant.tech/documentation/scaling/)
- [Qdrant Create Collection API](https://api.qdrant.tech/api-reference/collections/create-collection)
- [Qdrant Query Points API](https://api.qdrant.tech/api-reference/search/query-points/)
- [Qdrant Python Client](https://github.com/qdrant/qdrant-client)

## Conclusion

Size automatic shards for distribution and future growth, use custom sharding only when the application intentionally routes a low-cardinality key, and choose replication from the failure tolerance you need. Set `write_consistency_factor` from the number of copies that must acknowledge, not from the desired write order. Add `ordering` for concurrent-write sequencing and read `consistency` for replica reconciliation. Finally, test node loss and recovery: the right settings are the ones whose observed availability, latency, and final state match the service's documented contract.
