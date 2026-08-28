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
- Inventory every read and write path, including Scroll, count, recommend, update-by-filter, and delete-by-filter.
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

Restart the service according to the deployment method, then test authentication over TLS. Qdrant Cloud enables granular access authentication by default.

The configured `api_key` is also the HS256 secret Qdrant uses to verify granular JWTs. Anyone who can read it can mint administrative tokens, so tenant-facing services must never receive it. Changing the primary API key invalidates existing JWTs. Current Qdrant versions support an alternate key for staged admin-key rotation, but JWTs must still be re-created for the new signing key.

## Understand the Current JWT Claims

Qdrant documents three claims that matter here:

- `exp`: Unix expiration time in seconds. Qdrant allows 30 seconds of clock-skew leeway.
- `access`: Global `r` or `m`, or a list of collection entries with `r` or `rw`.
- `value_exists`: Makes the token valid only while a point with specified payload values exists in a validation collection.

If `access` is absent, Qdrant assumes manage access. Always emit an explicit, least-privilege `access` claim.

A collection-scoped token can be generated offline with PyJWT:

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
            "access": "rw",
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

The provisioning system must create the matching validation point before issuing this token. It should use the admin key, not the tenant token.

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
- Deleting the point or changing one of the matched values makes the token invalid.
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

Issue the tenant a token whose `access` list contains only that collection. A request using the same token against `tenant_b_documents` must be denied.

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

For writes, overwrite any user-supplied `tenant_id` with the authenticated tenant. For filtered updates and deletes, combine the tenant condition with the business condition in `must`. If tenant context is absent, fail before sending a Qdrant request.

Do not give a browser or untrusted tenant process a collection-scoped token for the shared collection. Such a token authorizes the whole collection, and the caller can omit or alter the payload filter.

Custom shard keys do not close this authorization gap. They route operations to shard groups, but current JWT RBAC cannot bind a token to one shard key.

## What Happened to Legacy JWT Payload Filters?

Before Qdrant 1.16, a collection entry could include a payload filter resembling:

```json
{
  "access": [
    {
      "collection": "documents",
      "access": "r",
      "payload": {
        "must": [
          {
            "key": "tenant_id",
            "match": {"value": "tenant-a"}
          }
        ]
      }
    }
  ]
}
```

This is shown only to help identify and remove legacy configuration. Qdrant deprecated payload filters in 1.15 and removed them in 1.16 because their write semantics could not be made safe. Current servers reject tokens containing this legacy field rather than silently ignoring it. Do not use this structure in new code.

If an older deployment still depends on it, treat the upgrade as an authorization migration:

1. Inventory every token issuer and decode representative tokens without logging secrets.
2. Put a trusted gateway in front of shared collections or split security tenants into collections.
3. Add negative tests for every read and write endpoint.
4. Revoke the old tokens and rotate their signing key after the new path is active.
5. Upgrade and confirm the old payload field is no longer part of the security model.

## Verify That the Design Fails Closed

Run automated tests with non-production data:

1. A tenant A collection token can read and, if granted `rw`, write `tenant_a_documents`.
2. The same token is denied access to `tenant_b_documents`.
3. A read-only collection token cannot upsert or delete points.
4. A token with an expired `exp` is denied, accounting for the documented 30-second leeway.
5. Removing or changing the matching validation point invalidates a token carrying `value_exists`.
6. Omitting `access` is rejected by your token issuer even though Qdrant would default it to manage access.
7. A shared-collection gateway rejects missing tenant context and ignores a caller-supplied tenant override.
8. Every returned payload from a tenant-scoped wrapper has the authenticated tenant ID.

Also test Scroll, count, recommendation, grouping, update-by-filter, and delete-by-filter. Testing only nearest-neighbor queries leaves common escape paths uncovered.

## Recovery and Rotation Cautions

Keep an emergency admin credential outside the tenant-serving path, with audited access. If a bad token policy is deployed, revoke issued tokens and restore access through that controlled credential rather than broadening tenant tokens.

Changing the main API key invalidates JWTs signed with it. Qdrant 1.17 introduced `alt_api_key` for a rolling admin-key change in distributed deployments, but JWTs are tied to their signing key and must be regenerated. Plan token reissuance before rotation.

Removing a `value_exists` validation point revokes every token that depends on that exact point state. Back up the authorization source of truth and make revocation updates deliberate and auditable.

## Version Scope and Limitations

- Granular JWT RBAC is available from Qdrant 1.9.
- The tenant payload-index option `is_tenant` is available from Qdrant 1.11.
- JWT payload filters were deprecated in Qdrant 1.15, removed in 1.16, and are not a current tenant-isolation mechanism.
- `alt_api_key` rotation is available from Qdrant 1.17.
- `value_exists` exact-match AND semantics are confirmed by the current Qdrant claims implementation; verify them again when pinning a materially different server version.
- Qdrant JWTs use HS256 with the configured admin API key as the secret. They do not consume an external identity provider's asymmetric token directly unless a trusted component translates and signs the Qdrant token.

## Official Documentation

- [Qdrant Security and Granular Access API Keys](https://qdrant.tech/documentation/security/#granular-access-api-keys)
- [Qdrant Current JWT Claims Implementation](https://github.com/qdrant/qdrant/blob/master/src/common/auth/claims.rs)
- [Qdrant Maintainer Answer on JWT Payload-Filter Deprecation](https://github.com/orgs/qdrant/discussions/7987)
- [Qdrant 1.16 Release](https://github.com/qdrant/qdrant/releases/tag/v1.16.0)
- [Qdrant Multitenancy](https://qdrant.tech/documentation/manage-data/multitenancy/)
- [Qdrant Filtering](https://qdrant.tech/documentation/search/filtering/)
- [Qdrant Collections](https://qdrant.tech/documentation/manage-data/collections/#setting-up-multitenancy)

## Conclusion

On current Qdrant, JWT RBAC enforces collection permissions, not payload-level tenant filters. Use collection-per-tenant plus a collection-scoped JWT when Qdrant itself must enforce the boundary. Use a trusted gateway for a shared collection, inject and filter the tenant on every operation, and keep direct tenant access disabled. Treat `value_exists` as a revocation check, `is_tenant` as a performance hint, and any pre-1.16 JWT `payload` claim as legacy configuration that must be migrated.
