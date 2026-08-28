# How to Enforce Tenant Isolation in Qdrant with JWT RBAC Payload Filters

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Qdrant, Security, JWT, RBAC, Multitenancy

Description: Understand the current Qdrant JWT RBAC boundary, replace deprecated JWT payload filters, and implement tenant isolation that fails closed.

---

Current Qdrant JWT RBAC cannot enforce a payload filter inside a shared collection. The older collection access entry supported a `payload` filter, but Qdrant deprecated that capability in version 1.15 and removed it in 1.16 because it could not provide safe semantics for write operations. Current granular JWTs scope access by collection and access level.

That version boundary changes the safe design:

- For Qdrant-enforced tenant isolation, give each tenant a collection and issue a collection-scoped JWT.
- For one shared collection, place Qdrant behind a trusted service that injects and filters `tenant_id` on every operation. JWT RBAC can still restrict the service to the shared collection, but it cannot enforce the tenant row boundary.

Do not copy a legacy JWT `payload` example into a current deployment. A token that lacks the expected restriction is a security failure, even if ordinary application tests appear to filter correctly.

## Prerequisites

Before changing authentication:

- Check the exact Qdrant server version with the service API or deployment metadata.
- Inventory every read and write path, including direct and batch retrieval by ID, Scroll, count, facets, distance-matrix queries, Query API recommendation and grouping, batch updates, payload and vector mutations, and ID- and filter-selected deletes.
- Decide whether clients may connect directly to Qdrant. Shared-collection tenants should not.
- Keep the Qdrant admin key in a server-side secret store.
- Enable TLS before sending API keys or JWTs over a network.
- Prepare negative authorization tests using disposable collections and data.

The examples use:

```bash
export QDRANT_URL='https://qdrant.example.com:6333'
export QDRANT_ADMIN_API_KEY='replace-with-a-long-random-secret'
```

## Enable Granular JWT RBAC

On self-hosted Qdrant, configure both an admin API key and JWT RBAC:

```yaml
service:
  api_key: replace-with-a-long-random-secret
  jwt_rbac: true
```

The equivalent environment variables are:

```bash
export QDRANT__SERVICE__API_KEY='replace-with-a-long-random-secret'
export QDRANT__SERVICE__JWT_RBAC='true'
```

Restart the service according to the deployment method, then test authentication over TLS. Current Qdrant Cloud clusters enable granular access authentication by default. Clusters created before January 27, 2025 may still require it to be enabled from the Cloud console.

The configured `api_key` is also the HS256 secret Qdrant uses to verify granular JWTs. If `alt_api_key` is configured during rotation, Qdrant also accepts JWTs signed with that secret. Anyone who can read either signing key can mint administrative tokens, so tenant-facing services must never receive them. A JWT becomes invalid when its signing key is removed from both settings. Current Qdrant versions support the alternate key for staged admin-key rotation, but JWTs must still be re-created for the new signing key.

## Understand the Current JWT Claims

Qdrant documents three claims that matter here:

- `exp`: Unix expiration time in seconds. Qdrant allows 30 seconds of clock-skew leeway.
- `access`: Global `r` or `m`, or a list of collection entries with `r`, `rw`, or `prw`. The source-supported `prw` mode permits point reads and writes but not collection extras such as snapshots or payload indexes.
- `value_exists`: Makes the token valid only while a point with specified payload values exists in a validation collection.

If `access` is absent, Qdrant assumes manage access. Always emit an explicit, least-privilege `access` claim.

On self-hosted Qdrant, a collection-scoped token can be generated offline with PyJWT:

```python
import os
import time

import jwt

tenant_collection = "tenant_a_documents"

claims = {
    "sub": "tenant-a",
    "exp": int(time.time()) + 900,
    "access": [
        {
            "collection": tenant_collection,
            "access": "prw",
        }
    ],
    "value_exists": {
        "collection": "authorization_subjects",
        "matches": [
            {"key": "subject_id", "value": "tenant-a"},
            {"key": "enabled", "value": True},
        ],
    },
}

token = jwt.encode(
    claims,
    os.environ["QDRANT_ADMIN_API_KEY"],
    algorithm="HS256",
)
```

On Qdrant Managed Cloud, create a granular Database API key through the Cloud console or API instead. Managed Cloud returns the signed credential; it does not expose the cluster's HS256 signing secret for offline token minting. Its key-creation controls currently expose global read/manage or per-collection read/read-write rules and expiration, not the self-hosted `prw` or `value_exists` controls used above.

For the self-hosted example, the provisioning system must create the matching validation point before issuing the token. It should use the admin key, not the tenant token.

## Do Not Confuse `value_exists.matches` with a Payload Access Filter

`value_exists` validates the whole token. It does not restrict which points a permitted query may return.

For the claim above, Qdrant looks in `authorization_subjects` for one point whose payload satisfies both exact matches:

```json
{
  "subject_id": "tenant-a",
  "enabled": true
}
```

Current Qdrant source converts every `matches` entry into an exact match condition and places all of them in a `must` list. Therefore:

- All listed key/value matches must be true on the same point.
- `matches` is not a general Qdrant Filter object; it does not accept `should`, ranges, or an arbitrary nested filter.
- Deleting or changing every point that satisfies all listed matches makes the token invalid. Changing one matching point has no effect if another matching point remains.
- A matching `tenant_id` in this validation collection does not force queries in another collection to use that tenant ID.

This claim is useful for revocation and role-state checks. It is not row-level security.

## Send the JWT as the API Key

Use the encoded token in Qdrant's `api-key` header:

```bash
export QDRANT_TENANT_TOKEN='replace-with-the-signed-jwt'

curl -fsS \
  -H "api-key: $QDRANT_TENANT_TOKEN" \
  "$QDRANT_URL/collections/tenant_a_documents"
```

The Python client uses the same token through `api_key`:

```python
import os

from qdrant_client import QdrantClient

client = QdrantClient(
    url=os.environ["QDRANT_URL"],
    api_key=os.environ["QDRANT_TENANT_TOKEN"],
)

info = client.get_collection(collection_name="tenant_a_documents")
print(info.status)
client.close()
```

Never log the token, decoded claims containing sensitive identifiers, or the signing key.

## Supported Design 1: One Collection per Security Tenant

If tenants connect to Qdrant directly and Qdrant must reject cross-tenant operations, use a separate collection per tenant. The JWT's collection name then becomes the enforced boundary.

Create and configure the collection with the admin key:

```bash
curl -fsS -X PUT "$QDRANT_URL/collections/tenant_a_documents" \
  -H "api-key: $QDRANT_ADMIN_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "vectors": {
      "size": 384,
      "distance": "Cosine"
    }
  }'
```

Issue the tenant a token whose `access` list contains only that collection. On self-hosted Qdrant, use `prw` when the tenant only needs point operations; use `rw` only when it also needs collection extras such as payload indexes or collection snapshots. Managed Cloud keys expose collection read-only and read-write permissions, so select read-write when the tenant needs point writes. A request using the same token against `tenant_b_documents` must be denied.

This design has real overhead. Every collection has its own storage structures, indexes, optimizers, and operational lifecycle. Qdrant recommends separate collections for a limited number of tenants needing isolation, not one collection for an unbounded user population. In Qdrant Cloud, the default cluster limit is currently 1,000 collections.

Collection isolation also does not protect against an admin key, a manage token, or shared-cluster resource contention. Protect those boundaries separately.

## Supported Design 2: Trusted Gateway for a Shared Collection

For many small tenants, Qdrant recommends one shared collection with an indexed tenant payload. In current versions, a trusted application must enforce the tenant condition.

Create the tenant keyword index with the admin key:

```bash
curl -fsS -X PUT \
  "$QDRANT_URL/collections/documents/index?wait=true" \
  -H "api-key: $QDRANT_ADMIN_API_KEY" \
  -H 'Content-Type: application/json' \
  -d '{
    "field_name": "tenant_id",
    "field_schema": {
      "type": "keyword",
      "is_tenant": true
    }
  }'
```

`is_tenant: true` improves tenant-local storage layout. It does not reject a query with no filter or with another tenant's value.

The gateway must derive the tenant from its authenticated principal and build the filter itself:

```python
from qdrant_client import QdrantClient, models


def query_documents(
    qdrant: QdrantClient,
    authenticated_tenant_id: str,
    query_vector: list[float],
):
    return qdrant.query_points(
        collection_name="documents",
        query=query_vector,
        query_filter=models.Filter(
            must=[
                models.FieldCondition(
                    key="tenant_id",
                    match=models.MatchValue(
                        value=authenticated_tenant_id,
                    ),
                )
            ]
        ),
        limit=10,
        with_payload=True,
    ).points
```

For writes, always set a scalar `tenant_id` from the authenticated tenant and prevent cross-tenant point-ID collisions. Reserve that field across every payload mutation: reject attempts to change or delete it, translate a clear-payload request into a filtered overwrite that retains the authenticated `tenant_id`, and inject it into every full payload overwrite. Under default sharding, Qdrant upserts replace an existing point with the same ID, so derive stored point IDs from tenant context instead of accepting collection-global IDs directly. On Qdrant 1.17 or later, use `insert_only` for creates when an existing point must not be overwritten. For upserts intended to change existing points, combine the tenant condition in `update_filter` with `update_only` so a failed ownership check cannot become an insert.

For filtered updates and deletes, combine the tenant condition with the business condition in `must`. Do not forward unfiltered retrieve, payload, vector, or delete operations with caller-supplied point IDs. Route them through a filter containing both the tenant condition and `HasIdCondition`, or verify ownership before continuing when an API does not accept a filter. Recursively add the tenant condition to the top-level Query API filter and every nested prefetch filter; a top-level filter does not scope the candidates consumed by prefetch limits or fusion. For sparse vectors using IDF on Qdrant 1.19 or later, also add it to every applicable independent `params.idf.corpus` filter.

Verify ownership of point IDs used as nearest-neighbor, recommendation, discovery, context, or relevance-feedback inputs, including IDs resolved through `lookup_from`; a result filter does not authorize the point used as the query input. Query Groups `with_lookup` is a plain join by group ID and has no lookup payload filter, so disable it for shared lookup collections or independently authorize every looked-up point before returning it. If tenant context is absent, fail before sending a Qdrant request.

Do not give a browser or untrusted tenant process a collection-scoped token for the shared collection. Such a token authorizes the whole collection, and the caller can omit or alter the payload filter.

Custom shard keys do not close this authorization gap. They route operations to shard groups, but current JWT RBAC cannot bind a token to one shard key. If the gateway uses them, derive the shard selector from authenticated tenant context instead of accepting one from the caller; a request without a selector runs across all shard groups. Qdrant enforces point-ID uniqueness only within a shard key and advises against duplicate IDs across keys, so keep the tenant-derived IDs globally unique.

## What Happened to Legacy JWT Payload Filters?

Before Qdrant 1.16, a collection entry could include a payload constraint resembling:

```json
{
  "access": [
    {
      "collection": "documents",
      "access": "r",
      "payload": {
        "tenant_id": "tenant-a"
      }
    }
  ]
}
```

The legacy `payload` value was a map of JSON paths to exact values, not a general Qdrant `Filter`; Qdrant combined multiple entries as `must` conditions. This is shown only to help identify and remove legacy configuration. Qdrant deprecated payload constraints in 1.15 and removed them in 1.16 because their write semantics could not be made safe. Current servers reject tokens using a non-null legacy `payload` restriction rather than silently ignoring it. Do not use this structure in new code.

If an older deployment still depends on it, treat the upgrade as an authorization migration:

1. Inventory every token issuer and decode representative tokens without logging secrets.
2. Put a trusted gateway in front of shared collections or split security tenants into collections.
3. Add negative tests for every read and write endpoint.
4. Revoke the old tokens and rotate their signing key after the new path is active.
5. Upgrade and confirm the old payload field is no longer part of the security model.

## Verify That the Design Fails Closed

Run automated tests with non-production data:

1. A tenant A collection token can read and, if granted `prw` or `rw`, write points in `tenant_a_documents`.
2. The same token is denied access to `tenant_b_documents`.
3. A read-only collection token cannot upsert or delete points.
4. A token with an expired `exp` is denied, accounting for the documented 30-second leeway.
5. On self-hosted Qdrant, removing or changing the only matching validation point invalidates a token carrying `value_exists`.
6. Omitting `access` is rejected by your token issuer even though Qdrant would default it to manage access.
7. A shared-collection gateway rejects missing tenant context and ignores a caller-supplied tenant override.
8. A tenant cannot retrieve, use as a query input, update, overwrite, or delete another tenant's point by ID, remove or change a stored `tenant_id`, or transfer ownership by re-upserting the same ID.
9. Every returned payload from a tenant-scoped wrapper, including a group lookup, has the authenticated tenant ID.
10. Every batch subrequest and nested prefetch is tenant-filtered, and an IDF corpus or custom shard selector cannot be supplied to widen the tenant boundary.

Also test Scroll, count, facets, distance matrices, Query API recommendation, relevance feedback, grouping and `with_lookup`, batch operations, every payload and vector mutation, update-by-filter, and delete-by-filter. Testing only nearest-neighbor queries leaves common escape paths uncovered.

## Recovery and Rotation Cautions

Keep an emergency admin credential outside the tenant-serving path, with audited access. If a bad token policy is deployed, revoke issued tokens and restore access through that controlled credential rather than broadening tenant tokens.

Removing the old signing key from both `api_key` and `alt_api_key` invalidates JWTs signed with it. Qdrant 1.17 introduced `alt_api_key` for a rolling admin-key change in distributed deployments, but JWTs are tied to their signing key and must be regenerated. Plan token reissuance before removing the old key.

On self-hosted Qdrant, removing or changing all validation points that satisfy a token's complete `value_exists.matches` list revokes that token. Back up the authorization source of truth and make revocation updates deliberate and auditable.

## Version Scope and Limitations

- Granular JWT RBAC is available in self-hosted Qdrant from 1.9. Managed Cloud granular Database API keys require a cluster running Qdrant 1.11 or later.
- The tenant payload-index option `is_tenant` is available from Qdrant 1.11.
- JWT payload filters were deprecated in Qdrant 1.15, removed in 1.16, and are not a current tenant-isolation mechanism.
- Conditional `update_filter` support is available from Qdrant 1.16. The upsert `insert_only` and `update_only` modes are available from 1.17.
- `alt_api_key` rotation is available from Qdrant 1.17.
- Per-tenant IDF corpus filtering is available from Qdrant 1.19; its corpus filter is independent of the retrieval filter.
- `value_exists` exact-match AND semantics are confirmed by the current Qdrant claims implementation; verify them again when pinning a materially different server version.
- Self-hosted Qdrant JWTs use HS256 with the configured `api_key` or `alt_api_key` as the secret. Managed Cloud returns an already signed Database API key instead of exposing that secret, and its current key API does not expose `prw` or `value_exists`. Qdrant does not consume an external identity provider's asymmetric token directly unless a trusted component translates and signs the Qdrant token.

## Official Documentation

- [Qdrant Security and Granular Access API Keys](https://qdrant.tech/documentation/security/#granular-access-api-keys)
- [Qdrant Managed Cloud Database Authentication](https://qdrant.tech/documentation/cloud/authentication/)
- [Qdrant Managed Cloud Database API Key Schema](https://github.com/qdrant/qdrant-cloud-public-api/blob/main/proto/qdrant/cloud/cluster/auth/v2/database_api_key.proto)
- [Qdrant 1.19 JWT Claims Implementation](https://github.com/qdrant/qdrant/blob/v1.19.0/src/common/auth/claims.rs)
- [Qdrant 1.19 RBAC Access Implementation](https://github.com/qdrant/qdrant/blob/v1.19.0/lib/storage/src/rbac/mod.rs)
- [Qdrant Maintainer Answer on JWT Payload-Filter Deprecation](https://github.com/orgs/qdrant/discussions/7987)
- [Qdrant 1.16 Release](https://github.com/qdrant/qdrant/releases/tag/v1.16.0)
- [Qdrant Multitenancy](https://qdrant.tech/documentation/manage-data/multitenancy/)
- [Qdrant Filtering](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant Hybrid and Multi-Stage Queries](https://qdrant.tech/documentation/search/hybrid-queries/)
- [Qdrant Group Lookup](https://qdrant.tech/documentation/search/#lookup-in-groups)
- [Qdrant Points and Conditional Updates](https://qdrant.tech/documentation/manage-data/points/#conditional-updates)
- [Qdrant User-Defined Sharding](https://qdrant.tech/documentation/scaling/distributed_deployment/#user-defined-sharding)
- [Qdrant Collections](https://qdrant.tech/documentation/manage-data/collections/#setting-up-multitenancy)

## Conclusion

On current Qdrant, JWT RBAC enforces collection permissions, not payload-level tenant filters. Use collection-per-tenant plus a collection-scoped JWT when Qdrant itself must enforce the boundary. Use a trusted gateway for a shared collection, inject and filter the tenant on every operation, and keep direct tenant access disabled. Treat self-hosted `value_exists` as a revocation check, `is_tenant` as a performance hint, and any pre-1.16 JWT `payload` claim as legacy configuration that must be migrated.
