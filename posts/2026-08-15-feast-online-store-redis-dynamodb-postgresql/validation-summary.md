# Validation Summary: Choose a Feast Online Store: Redis, DynamoDB, or PostgreSQL

## Status

validated

## Post Type

Technical comparison guide

## Technologies Covered

- Feast v0.65.0
- Feast online stores and feature servers
- Redis
- Amazon DynamoDB
- PostgreSQL and pgvector
- Feast file and SQL registries

## Sources Consulted

- [Feast v0.65.0 release](https://github.com/feast-dev/feast/releases/tag/v0.65.0)
- [Feast online-store overview and functionality matrix](https://docs.feast.dev/reference/online-stores/overview)
- [Feast Redis online-store documentation](https://docs.feast.dev/reference/online-stores/redis)
- [Feast Redis v0.65.0 implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/online_stores/redis.py)
- [Feast DynamoDB online-store documentation](https://docs.feast.dev/reference/online-stores/dynamodb)
- [Feast DynamoDB v0.65.0 implementation](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/online_stores/dynamodb.py)
- [Feast PostgreSQL online-store documentation](https://docs.feast.dev/reference/online-stores/postgres)
- [Feast PostgreSQL v0.65.0 configuration](https://github.com/feast-dev/feast/blob/v0.65.0/sdk/python/feast/infra/utils/postgres/postgres_config.py)
- [Feast v0.65.0 Go online-store selection](https://github.com/feast-dev/feast/blob/v0.65.0/go/internal/feast/onlinestore/onlinestore.go)
- [Feast production deployment guidance](https://docs.feast.dev/how-to-guides/running-feast-in-production)
- [Feast scalable-registry guidance](https://docs.feast.dev/how-to-guides/scaling-feast)
- [AWS DynamoDB BatchGetItem API](https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_BatchGetItem.html)
- [AWS DynamoDB read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)
- [Redis pipelining](https://redis.io/docs/latest/develop/using-commands/pipelining/)
- [PostgreSQL SSL support](https://www.postgresql.org/docs/current/libpq-ssl.html)
- [PostgreSQL concurrency control](https://www.postgresql.org/docs/current/mvcc.html)

## Issues Found

- The post reproduced the published Feast matrix's `no` entries for DynamoDB and PostgreSQL Go readability without noting that Feast v0.65.0's alpha Go feature-server source implements readers for both stores. Added the release-specific discrepancy, advised validating the exact Go path, and narrowed the DynamoDB fallback recommendation so it no longer treats Go readability as absent from the implementation.
- The post stated that DynamoDB's `max_read_workers` controls parallel batches without qualifying the code path. In Feast v0.65.0 it limits the synchronous `online_read` thread pool, while the asynchronous reader uses `asyncio.gather` without that setting. Qualified the statement as applying to the synchronous read path.
- The PostgreSQL example selected `sslmode: verify-ca` but did not provide a root CA location. Feast's documentation requires the corresponding root certificate for certificate verification unless libpq's default trust file or environment setting is already provisioned. Added `sslrootcert_path: /path/to/server-ca.pem` to make the example complete.

## Review Notes

- The review targets Feast v0.65.0, the latest stable release available on 2026-08-20. The published functionality matrix is stale relative to the release's Go source for DynamoDB and PostgreSQL, and the Go feature server remains documented as alpha.
- DynamoDB `BatchGetItem` also has a 16 MB response limit and can return `UnprocessedKeys`; the post's statement that a request is limited to 100 items is still correct.
- Redis `key_ttl_seconds` expires the shared entity hash and is reset by writes to any FeatureView using that entity key. `FeatureView.ttl` does not filter online reads. The post describes the entity-level risk correctly.
- PostgreSQL `verify-full` additionally verifies the server hostname and is generally preferable to `verify-ca` in security-sensitive deployments; `verify-ca` remains a valid mode for the example.
- All external links in the post returned HTTP 200 during validation.
