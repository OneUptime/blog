# Validation Summary: How to Enforce Tenant Isolation in Qdrant with JWT RBAC Payload Filters

## Status

validated

## Post Type

Security implementation guide

## Technologies Covered

- Qdrant 1.9 through 1.19, with implementation details pinned to Qdrant 1.19
- Qdrant Managed Cloud Database API keys
- JSON Web Tokens (JWT), HS256 signing, and role-based access control (RBAC)
- Payload filtering and multitenant collection design
- Qdrant REST API, `curl`, YAML configuration, and environment variables
- Python, PyJWT, and `qdrant-client` 1.19.0

## Sources Consulted

- [Qdrant Security and Granular Access API Keys](https://qdrant.tech/documentation/security/#granular-access-api-keys)
- [Qdrant Managed Cloud Database Authentication](https://qdrant.tech/documentation/cloud/authentication/)
- [Qdrant Managed Cloud Database API Key v2 Schema](https://github.com/qdrant/qdrant-cloud-public-api/blob/main/proto/qdrant/cloud/cluster/auth/v2/database_api_key.proto)
- [Qdrant 1.19 JWT Claims Implementation](https://github.com/qdrant/qdrant/blob/v1.19.0/src/common/auth/claims.rs)
- [Qdrant 1.19 JWT Parser and Tests](https://github.com/qdrant/qdrant/blob/v1.19.0/src/common/auth/jwt_parser.rs)
- [Qdrant 1.19 RBAC Access Implementation](https://github.com/qdrant/qdrant/blob/v1.19.0/lib/storage/src/rbac/mod.rs)
- [Qdrant 1.19 RBAC Operation Checks](https://github.com/qdrant/qdrant/blob/v1.19.0/lib/storage/src/rbac/ops_checks.rs)
- [Qdrant 1.19 OpenAPI Schema](https://github.com/qdrant/qdrant/blob/v1.19.0/docs/redoc/v1.19.x/openapi.json)
- [Qdrant 1.14.1 Legacy RBAC Access Implementation](https://github.com/qdrant/qdrant/blob/v1.14.1/lib/storage/src/rbac/mod.rs) and [operation checks](https://github.com/qdrant/qdrant/blob/v1.14.1/lib/storage/src/rbac/ops_checks.rs)
- [Qdrant 1.15 Release](https://github.com/qdrant/qdrant/releases/tag/v1.15.0), [Qdrant 1.16 Release](https://github.com/qdrant/qdrant/releases/tag/v1.16.0), and [Qdrant 1.17 Release](https://github.com/qdrant/qdrant/releases/tag/v1.17.0)
- [Qdrant Maintainer Answer on JWT Payload-Filter Deprecation](https://github.com/orgs/qdrant/discussions/7987)
- [Qdrant Multitenancy](https://qdrant.tech/documentation/manage-data/multitenancy/) and [collection-per-tenant guidance](https://qdrant.tech/documentation/manage-data/collections/#setting-up-multitenancy)
- [Qdrant Points, Update Modes, and Conditional Updates](https://qdrant.tech/documentation/manage-data/points/#conditional-updates)
- [Qdrant Filtering and Has ID Conditions](https://qdrant.tech/documentation/search/filtering/#has-id)
- [Qdrant Hybrid and Multi-Stage Queries](https://qdrant.tech/documentation/search/hybrid-queries/) and [Group Lookup](https://qdrant.tech/documentation/search/#lookup-in-groups)
- [Qdrant User-Defined Sharding](https://qdrant.tech/documentation/scaling/distributed_deployment/#user-defined-sharding)
- [Qdrant Distance Matrix Pairs](https://api.qdrant.tech/api-reference/search/matrix-pairs) and [Distance Matrix Offsets](https://api.qdrant.tech/api-reference/search/matrix-offsets)
- [Qdrant `qdrant-client` 1.19.0 Package](https://pypi.org/project/qdrant-client/1.19.0/) and [PyJWT API](https://pyjwt.readthedocs.io/en/latest/api.html)

## Issues Found

- Managed Cloud capability scope was ambiguous. The self-hosted example uses `prw` and `value_exists`, but the current Managed Cloud key API exposes global read/manage or per-collection read/read-write rules and expiration, not those two controls. The Cloud and collection-per-tenant text now distinguishes the two platforms, and the validation-point instructions are explicitly self-hosted.
- The gateway write guidance did not preserve the tenant discriminator across every payload mutation. A tenant-filtered `delete_payload`, `clear_payload`, or `overwrite_payload` can remove or replace `tenant_id` after the ownership filter succeeds. The post now reserves a scalar `tenant_id`, rejects attempts to change or delete it, retains it when clearing payload, and reinjects it during full payload overwrites.
- The conditional-upsert guidance lacked a version boundary and was broader than the API. `update_filter` arrived in Qdrant 1.16, while the upsert modes `insert_only` and `update_only` arrived in 1.17. The text now scopes those modes to Qdrant 1.17 or later and describes `update_only` specifically for upserts intended to modify existing points.
- Query API filtering was incomplete for multi-stage searches. Top-level filters do not constrain the candidates consumed by nested prefetch limits and fusion, and Qdrant 1.19's IDF corpus filter is independent of the retrieval filter. The gateway guidance now recursively injects the tenant condition into every prefetch and every applicable `params.idf.corpus` filter.
- Indirect ID-based reads needed additional coverage. Relevance-feedback inputs and IDs resolved through `lookup_from` require ownership checks, while Query Groups `with_lookup` performs a plain ID join without a lookup payload filter. The post now requires ownership checks for those inputs and disables or independently authorizes shared-collection group lookups.
- Custom-shard behavior needed qualification. JWT RBAC cannot bind a token to a shard key, omitted selectors fan out across shard groups, and Qdrant enforces ID uniqueness only within a shard key. The post now requires the gateway to derive shard selectors from authenticated tenant context and retain globally unique tenant-derived point IDs.
- The fail-closed endpoint inventory omitted the distance-matrix read APIs, which return point IDs and scores and accept filters. Distance-matrix queries were added to the inventory and negative-test checklist.

## Review Notes

- The YAML, environment variables, `curl` requests, PyJWT example, and Python client examples are valid against Qdrant and `qdrant-client` 1.19.0. The REST request bodies match the Qdrant 1.19 OpenAPI schema.
- Qdrant 1.19.0 is the current server release as of the validation date. The post pins source links to that tag where implementation details matter.
- `prw` is supported by the Qdrant 1.19 source but is not listed in the high-level security documentation's collection-access example. The post correctly labels it source-supported; recheck it when targeting a materially different release.
- `insert_only` conflicts and `update_only` misses leave points unchanged. Callers should verify resulting state rather than treat request acknowledgment alone as proof that a point was created or updated.
- All external links in the post returned HTTP 200 during validation.
