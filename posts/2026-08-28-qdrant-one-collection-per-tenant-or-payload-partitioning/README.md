# One Collection per Tenant or Payload Partitioning? Designing Qdrant Multitenancy

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Qdrant, Multitenancy, Vector Database, Payload Indexing, Architecture

Description: Choose between shared payload partitioning, dedicated collections, and custom shards for a safe, scalable Qdrant multitenancy design.

---

The usual Qdrant multitenancy design is one collection containing many tenants, with a tenant identifier in every point's payload and a matching tenant condition in every tenant-scoped operation that accepts a filter. A collection per tenant is appropriate when the tenant count is limited and the extra isolation or per-tenant configuration is worth the resource and operational overhead.

There is also a middle option: user-defined sharding. It can give a smaller number of large tenants dedicated shard groups while retaining one collection. Qdrant 1.16 and later add tiered multitenancy, which combines a shared fallback shard for small tenants with dedicated shards for tenants that grow.

These choices affect storage and performance. They do not replace authentication or authorization.

## Prerequisites

Before choosing a layout, record:

- The expected tenant count and the distribution of points per tenant.
- Whether every tenant uses the same vector dimensions, distance metric, named vectors, payload schema, and retention policy.
- Which tenants require separate backup, restore, deletion, or capacity-management workflows.
- The filters used by query, Scroll, count, update, and delete operations.
- Whether clients connect directly to Qdrant or through a trusted service.
- The Qdrant server and client versions used in production.

The examples use a 384-dimensional collection called `documents`:

```bash
export QDRANT_URL='http://localhost:6333'
export QDRANT_API_KEY='replace-with-an-admin-key'
```

Use TLS for any non-local connection. Do not expose the admin API key to tenant applications.

## Compare the Three Layouts

| Layout | Best fit | Main benefit | Main cost |
|---|---|---|---|
| One collection with a tenant payload | Many small or similarly sized tenants | Lowest collection and shard overhead | The application must enforce the correct tenant scope on every operation |
| One collection with custom shard keys | A smaller number of large tenants | Operations can target only a tenant's shard group | Each shard group consumes resources, and every operation must carry the correct shard key |
| One collection per tenant | A limited number of tenants needing a stronger operational boundary | Collection-scoped configuration, lifecycle, and JWT permissions | More collections, indexes, optimizers, and operational objects to manage |

All points in one collection share the collection's vector configuration. If tenants use incompatible embedding dimensions or distance metrics, separate collections are normally the cleanest design.

## Recommended Default: Partition by Payload

Create one collection for homogeneous tenant data:

```bash
curl -fsS -X PUT "$QDRANT_URL/collections/documents" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'
```

Immediately create a keyword payload index for the tenant field. The `is_tenant` flag tells Qdrant that the field identifies tenant partitions:

```bash
curl -fsS -X PUT \
  "$QDRANT_URL/collections/documents/index?wait=true" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "field_name": "tenant_id",
    "field_schema": {
      "type": "keyword",
      "is_tenant": true
    }
  }'
```

`is_tenant` is available from Qdrant 1.11. It is optional, but it lets Qdrant co-locate a tenant's vectors in storage so tenant-filtered queries can use more sequential I/O. It is a storage and performance hint, not an authorization rule. A request without a tenant filter is not made safe by this index.

The equivalent Python setup is:

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
        size=384,
        distance=models.Distance.COSINE,
    ),
)

client.create_payload_index(
    collection_name="documents",
    field_name="tenant_id",
    field_schema=models.KeywordIndexParams(
        type=models.KeywordIndexType.KEYWORD,
        is_tenant=True,
    ),
    wait=True,
)
```

Create known payload indexes before ingestion. Besides speeding compatible filters, this lets the later HNSW build include filter-aware edges.

## Make the Tenant Part of Every Write

The trusted ingestion service should derive `tenant_id` from its authenticated request context. It should not accept an arbitrary tenant value from an untrusted request body.

```python
from qdrant_client import models


def upsert_for_tenant(
    client: QdrantClient,
    tenant_id: str,
    point_id: str,
    vector: list[float],
    text: str,
) -> None:
    client.upsert(
        collection_name="documents",
        points=[
            models.PointStruct(
                id=point_id,
                vector=vector,
                payload={
                    "tenant_id": tenant_id,
                    "text": text,
                },
            )
        ],
        wait=True,
    )
```

Point IDs in an automatically sharded collection must be unique across the collection, not merely within a tenant. Qdrant accepts unsigned 64-bit integers or UUIDs as point IDs; an arbitrary string is invalid. For deterministic string IDs, generate a UUIDv5 from a canonical tenant ID plus the tenant-local document key. This keeps retries idempotent without allowing two tenants' local IDs to overwrite one another.

## Make the Tenant Filter Non-Optional

A safe query wrapper accepts the tenant from trusted authentication context and constructs the Qdrant filter itself:

```python
def query_for_tenant(
    client: QdrantClient,
    tenant_id: str,
    query_vector: list[float],
):
    return client.query_points(
        collection_name="documents",
        query=query_vector,
        query_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="tenant_id",
                    match=models.MatchValue(value=tenant_id),
                )
            ]
        ),
        limit=10,
        with_payload=["tenant_id", "text"],
    ).points
```

The current REST Query API uses the same filter:

```bash
curl -fsS -X POST \
  "$QDRANT_URL/collections/documents/points/query" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d "$(jq -nc '{
    query: [range(384) | 0.1],
    filter: {
      must: [
        {
          key: "tenant_id",
          match: {value: "tenant-a"}
        }
      ]
    },
    limit: 10,
    with_payload: ["tenant_id", "text"]
  }')"
```

The generated query vector has 384 dimensions to match the example collection; replace it with a real embedding.

Apply the same mandatory condition to:

- Scroll and count requests.
- Delete-by-filter and payload-update requests.
- Recommendation, discovery, grouping, and multi-stage queries.
- Any administrative export or reconciliation tool that is meant to be tenant-scoped.

Point-by-ID retrieval does not accept a payload filter. When a caller supplies an ID, use Query or Scroll with both an ID condition and the tenant condition instead.

Do not retrieve broad results and filter them after Qdrant returns them. That both wastes work and creates a data-exposure boundary in application memory.

## When a Collection per Tenant Is the Better Boundary

Choose dedicated collections when the number of tenants is controlled and one or more of these requirements are material:

- Tenants use different embedding models, dimensions, or distance metrics.
- HNSW, quantization, on-disk storage, replication, or strict-mode settings must differ by tenant.
- Backup, restore, retention, or deletion must operate on an independent collection.
- Direct Qdrant access must be restricted with collection-scoped JWT RBAC.
- A missing application payload filter must not expose another tenant's points.

A collection boundary does not make two tenants independent if they still share the same cluster resources. Capacity limits, noisy-neighbor controls, network policy, and admin-key handling remain separate concerns. Qdrant's own documentation recommends multiple collections only for a limited number of tenants because each collection has overhead. Qdrant Cloud currently applies a default maximum of 1,000 collections per cluster.

For collection-scoped JWTs, name collections from a trusted internal tenant mapping. Never let a user choose an arbitrary collection name and then issue a token for it.

## When to Use User-Defined Sharding

Custom sharding is useful for a relatively small number of large tenants whose requests should touch only their own shard group:

Shard-key management requires Qdrant's distributed mode, so these commands must target a cluster-enabled deployment rather than a default standalone server.

```bash
curl -fsS -X PUT "$QDRANT_URL/collections/large_tenant_documents" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {"size": 384, "distance": "Cosine"},
    "sharding_method": "custom",
    "shard_number": 1
  }'

curl -fsS -X PUT \
  "$QDRANT_URL/collections/large_tenant_documents/shards" \
  -H "api-key: $QDRANT_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{"shard_key": "tenant-a"}'
```

With automatic sharding, `shard_number` is the total logical shard count. With custom sharding, it is the default number of shards created for each shard key; an individual create-shard-key request can override it with `shards_number`. Ten shard keys, one shard per key, and replication factor two produce twenty physical shard replicas. This is why a high-cardinality tenant key belongs in payload partitioning rather than custom sharding.

Every custom-sharded write and query must include the correct `shard_key`. An operation that omits it can fan out to all shards. Keep the tenant payload filter too: shard routing is a performance and placement boundary, not proof that the caller is authorized. Qdrant also warns against reusing the same point ID across different shard keys even though current uniqueness enforcement is local to a shard key.

## Consider Tiered Multitenancy for Skewed Tenants

Qdrant 1.16 introduced tiered multitenancy for a common skewed distribution: many small tenants and a few large ones. Small tenants share one fallback shard; a growing tenant can be promoted to a dedicated shard while the application uses a fallback-plus-target shard selector.

This feature has current operational limits. The shared fallback and dedicated tenant shard groups must use one shard, and a dedicated tenant shard is initially created with one replica for promotion. Replication can be increased after transfer. Confirm these constraints against the server version you deploy before adopting the design.

## Verify Isolation and Layout

First verify the tenant index:

```bash
curl -fsS \
  -H "api-key: $QDRANT_API_KEY" \
  "$QDRANT_URL/collections/documents" |
  jq '.result.payload_schema.tenant_id'
```

Then automate negative tests in a non-production collection:

1. Insert distinct marker points for tenants A and B.
2. Query as tenant A and assert every returned payload has `tenant_id == "tenant-a"`.
3. Exercise Scroll, count, update, and delete wrappers with the same assertion.
4. Attempt to supply `tenant-b` in an untrusted body and prove the service ignores or rejects it.
5. Test a request path that omits tenant context and prove it fails closed before calling Qdrant.

For custom sharding, also list shard keys and inspect collection cluster information. Verify that tenant-targeted operations carry both the intended shard selector and payload filter.

## Migration and Rollback Cautions

Changing between collection layouts is a data migration, not a metadata toggle. Build the destination collection with the final vector and payload indexes, then either pause mutations or mirror them to both layouts while copying data with stable point IDs. Reconcile any changes, compare exact counts and sampled queries, then switch callers deliberately. Keep the source read-only until the destination has passed correctness, performance, backup, and restore checks.

Do not delete source collections or shard keys as an immediate rollback step. Deleting either removes data. Take and test snapshots appropriate to the deployment before destructive cleanup.

## Version Scope and Limitations

- `is_tenant` is available from Qdrant 1.11.
- User-defined sharding is available from Qdrant 1.7.
- Tiered multitenancy is available from Qdrant 1.16 and has version-specific shard and promotion constraints.
- Collection defaults, Cloud limits, resharding availability, and automatic rebalancing differ between Qdrant Cloud and self-hosted Qdrant.
- Payload partitioning is not a database authorization mechanism. Current JWT RBAC is collection-scoped; current releases do not inject a tenant payload filter from a JWT.

## Official Documentation

- [Qdrant Multitenancy](https://qdrant.tech/documentation/manage-data/multitenancy/)
- [Qdrant Collections: Setting Up Multitenancy](https://qdrant.tech/documentation/manage-data/collections/#setting-up-multitenancy)
- [Qdrant Distributed Deployment: Sharding and Replication](https://qdrant.tech/documentation/scaling/distributed_deployment/)
- [Qdrant Payload Indexing](https://qdrant.tech/documentation/manage-data/indexing/#payload-index)
- [Qdrant Filtering](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant Query Points API](https://api.qdrant.tech/api-reference/search/query-points/)
- [Qdrant Create a Shard Key API](https://api.qdrant.tech/api-reference/distributed/create-shard-key)
- [Qdrant Security and Granular Access Keys](https://qdrant.tech/documentation/security/#granular-access-api-keys)

## Conclusion

Use one collection with an indexed tenant payload for many homogeneous tenants, and make tenant injection and filtering mandatory in a trusted service. Use custom shard keys for a smaller set of large tenants, or Qdrant 1.16+ tiered multitenancy for a skewed population. Choose one collection per tenant when collection-scoped security, configuration, or lifecycle isolation is worth the overhead. In every layout, treat storage placement, authentication, and authorization as separate controls and test that every operation fails closed when tenant context is missing.
