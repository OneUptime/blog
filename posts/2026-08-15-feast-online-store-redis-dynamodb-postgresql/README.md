# Choose a Feast Online Store: Redis, DynamoDB, or PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Feast, Redis, DynamoDB, PostgreSQL, Online Store, Feature Serving

Description: Compare three Feast online stores by serving path, concurrency contract, TTL support, operations, and measured workload needs.

---

Redis, DynamoDB, and PostgreSQL can all back Feast online feature retrieval, but they are not interchangeable latency tiers. The right choice depends on the Feast client path, same-key write behavior, freshness enforcement, operational platform, entity batch size, and workload measurements.

Start with Feast's current online-store functionality matrix. It describes capabilities of each Feast integration, which can be narrower than the native database.

## Compare the Feast Integration First

At the time of writing, the official Feast pages report these notable differences:

| Feast capability | Redis | DynamoDB | PostgreSQL |
| --- | --- | --- | --- |
| read and write online features | yes | yes | yes |
| Python SDK readable | yes | yes | yes |
| Go client/server readable | yes | no | no |
| Java readable | yes | no | no |
| concurrent writes to the same key | yes | no | no |
| TTL at retrieval | yes | no | no |
| delete expired data | yes | no | no |
| entityless FeatureViews | yes | yes | yes |

Recheck the pages for the Feast version you deploy. "No" here means the published Feast matrix does not advertise that capability. It does not mean the underlying database lacks all concurrency or expiration features. Feast v0.65.0's alpha Go feature-server source implements Redis, DynamoDB, and PostgreSQL readers even though the matrix marks the latter two "no," so validate the exact release and configuration before relying on that path.

## Choose Redis for the Broadest Feast Serving Surface

Redis is a strong default when very low-latency key lookup, high request concurrency, Go or Java readability, and Feast-managed stale-value behavior matter.

```yaml
online_store:
  type: redis
  connection_string: redis.internal:6379
  key_ttl_seconds: 86400
```

Its Feast integration co-locates by entity key and supports concurrent writes to the same key. The `key_ttl_seconds` setting can physically remove entity-level data, so verify the effect when several FeatureViews share an entity.

Operational tradeoffs include memory cost, cluster topology, persistence and failover configuration, hot keys, and connection management. Redis pipelining can reduce round trips for multiple commands, but benchmark through Feast because serialization and feature-server processing are part of the request too.

Choose Redis when:

- p99 latency is strict and measured Redis performance meets it;
- several writers may update one entity key;
- Feast TTL retrieval or deletion support is required;
- the current Go serving path is being evaluated and its supported store list fits.

## Choose DynamoDB for AWS-Managed Scale

DynamoDB removes server provisioning and provides an AWS-native capacity, IAM, and availability model. Feast's current configuration includes batch-read tuning and an optional consistent-read setting:

```yaml
online_store:
  type: dynamodb
  region: eu-west-2
  batch_size: 100
  max_read_workers: 10
  consistent_reads: false
```

Feast documents that `BatchGetItem` is limited to 100 items per request, and `max_read_workers` controls parallel batches on the synchronous read path. AWS documents that eventually consistent reads are the default, while strongly consistent reads are available for tables and local secondary indexes at a higher capacity cost.

The current Feast matrix does not advertise same-key concurrent writing, retrieval TTL, expired-data deletion, or Go/Java readability for DynamoDB. Feast v0.65.0's alpha Go feature-server source nevertheless includes a DynamoDB reader. If same-key concurrent writing, retrieval TTL, expired-data deletion, or Java readability is mandatory, either add an explicitly tested application layer or select another integration.

Choose DynamoDB when:

- the platform is already AWS-first;
- managed capacity and IAM matter more than a portable database;
- request batches and consistency mode are understood;
- writers can be serialized or partitioned so the plugin's same-key limitation is acceptable.

## Choose PostgreSQL for Operational Simplicity and SQL Adjacency

PostgreSQL is attractive when the organization already operates it well, traffic is moderate, and avoiding another data system outweighs the last increment of lookup performance.

```yaml
online_store:
  type: postgres
  host: postgres.internal
  port: 5432
  database: feast
  db_schema: online_features
  user: feast_reader
  password: DB_PASSWORD
  sslmode: verify-ca
  sslrootcert_path: /path/to/server-ca.pem
```

The current Feast integration persists only the latest feature values and supports SSL configuration and optional pgvector features. Inject or render the credential securely before Feast reads this file; do not commit a real password. Its published matrix does not advertise same-key concurrent writes, TTL behavior, or Java readability. Although that matrix also marks Go readability "no," Feast v0.65.0's alpha Go feature-server source includes a PostgreSQL reader; test this path with the exact release.

PostgreSQL also introduces connection-pool sizing, vacuum and index health, transaction contention, and noisy-neighbor risks. PostgreSQL's MVCC gives native database concurrency, but that does not override the narrower Feast same-key write contract. Test the exact online-write implementation before permitting competing stream and batch writers.

Choose PostgreSQL when:

- expected QPS and p99 latency fit a measured SQL deployment;
- Python is the serving client;
- the team values one familiar backup, security, and monitoring stack;
- vector retrieval through the documented Feast integration is relevant.

## Benchmark the Whole Serving Path

Do not select from database marketing numbers. Benchmark:

```text
client -> load balancer -> Feast SDK or feature server
       -> registry/cache -> online store -> transformation -> response
```

Use production-like entity counts, number and size of features, FeatureViews per request, on-demand transformations, TLS, cross-zone topology, and concurrent batch or stream writes. Report p50, p95, p99, timeout rate, missing rate, and cost per expected traffic unit.

Test failure behavior too:

- store failover and connection recovery;
- throttling or pool exhaustion;
- concurrent writes to the same entity;
- registry refresh during a schema deployment;
- a stale value beyond its allowed age;
- partial multi-entity responses.

## Keep Registry Choice Separate

The Feast online store holds feature values. The Feast registry holds metadata. Choosing PostgreSQL as an online store does not automatically configure a SQL registry, and choosing Redis online does not prevent using PostgreSQL for registry metadata.

For production with concurrent materialization writers, Feast recommends a SQL registry because a file registry rewrites the entire serialized registry and has documented concurrency limitations.

## Official Documentation

- [Feast online-store overview](https://docs.feast.dev/reference/online-stores/overview)
- [Feast Redis online store](https://docs.feast.dev/reference/online-stores/redis)
- [Feast DynamoDB online store](https://docs.feast.dev/reference/online-stores/dynamodb)
- [Feast PostgreSQL online store](https://docs.feast.dev/reference/online-stores/postgres)
- [Feast v0.65.0 Go online-store selection](https://github.com/feast-dev/feast/blob/v0.65.0/go/internal/feast/onlinestore/onlinestore.go)
- [AWS DynamoDB read consistency](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/HowItWorks.ReadConsistency.html)
- [Redis pipelining](https://redis.io/docs/latest/develop/using-commands/pipelining/)
- [PostgreSQL concurrency control](https://www.postgresql.org/docs/current/mvcc.html)

## Conclusion

Redis currently offers the broadest Feast concurrency, TTL, and client surface. DynamoDB offers AWS-managed operations with explicit consistency and batch tuning. PostgreSQL offers familiar SQL operations for moderate workloads. Confirm the current plugin matrix, then choose with an end-to-end benchmark and failure test.
