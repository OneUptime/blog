# Validation Summary: Redis OSS vs Redis Enterprise vs AWS ElastiCache: Managed Service Comparison

## Status
validated

## Post Type
Technical comparison guide

## Technologies Covered
- Redis Open Source
- Redis Enterprise Cloud
- Redis Enterprise Software
- AWS ElastiCache for Redis OSS
- Redis Cluster and Sentinel
- Bitnami Redis Helm chart
- redis-py
- AWS CLI
- Redis Enterprise REST API

## Sources Consulted
- Redis Open Source 8.0 release notes: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/release-notes/redisce/redisos-8.0-release-notes/
- Redis Enterprise Active-Active database REST API: https://redis.io/docs/latest/operate/rs/references/rest-api/requests/crdbs/
- Redis Enterprise Active-Active documentation: https://redis.io/docs/latest/operate/rs/databases/active-active/
- Redis Enterprise import data documentation: https://redis.io/docs/latest/operate/rs/databases/import-export/import-data/
- RedisGraph end-of-life documentation: https://redis.io/docs/latest/operate/oss_and_stack/stack-with-enterprise/deprecated-features/graph/
- Redis Cloud pricing page: https://redis.io/pricing/
- redis-py Redis Search documentation: https://redis.io/docs/latest/develop/clients/redis-py/queryjson/
- Bitnami Redis Helm chart documentation: https://artifacthub.io/packages/helm/bitnami/redis
- AWS ElastiCache replication groups and cluster mode documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Replication.CreatingReplGroup.NoExistingCluster.Cluster.html
- AWS ElastiCache Global Datastore documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Redis-Global-Datastore.html
- AWS ElastiCache data tiering documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/data-tiering.html
- AWS ElastiCache IAM authentication documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/auth-iam.html
- AWS ElastiCache online migration documentation: https://docs.aws.amazon.com/AmazonElastiCache/latest/dg/Migration-Initiate.html
- AWS ElastiCache pricing page: https://aws.amazon.com/elasticache/pricing/
- AWS public pricing API for EC2 and ElastiCache us-east-1 rates.

## Issues Found
- Redis OSS licensing was listed as only SSPL. Updated it to the Redis 8+ license choices: RSALv2, SSPLv1, or AGPLv3.
- The Redis Enterprise Active-Active REST example used outdated/non-current field names. Replaced it with the current `/v1/crdbs` request shape using `default_db_config` and `instances`.
- Redis Enterprise REST examples omitted API authentication. Added basic auth placeholders to the `curl` requests.
- RedisGraph and RedisAI were listed as current Enterprise modules. Removed RedisAI and added a RedisGraph end-of-life note.
- Redis Enterprise Cloud tier and pricing descriptions were outdated. Updated them to match current Free/Essentials/Pro positioning and minimum pricing.
- AWS EC2 and ElastiCache price examples were outdated. Updated the us-east-1 examples against current public AWS pricing data.
- The ElastiCache IAM Python example used a nonexistent `boto3.client('elasticache').generate_auth_token()` API. Replaced it with SigV4 presigned-token generation using botocore.
- The ElastiCache data tiering command was missing required `create-replication-group` parameters. Added the missing replication group, engine, shard, and replica options.
- ElastiCache max-memory and auto-scaling comparison entries were outdated. Updated them to reflect shard/node-dependent limits and ElastiCache Auto Scaling support.
- The self-hosted-to-ElastiCache migration example incorrectly ran `SLAVEOF` on the source and referenced AWS DMS. Replaced it with ElastiCache online migration using `start-migration`.
- The ElastiCache snapshot example omitted the required source identifier. Added `--replication-group-id`.
- The Redis Enterprise import endpoint was incorrect. Replaced it with the current `/v1/bdbs/{uid}/actions/import` endpoint and `dataset_import_sources` payload.
- Updated stale Redis documentation links to current Redis documentation URLs.

## Review Notes
Pricing remains region- and date-sensitive. The post now uses current us-east-1 examples as of 2026-06-21, but future pricing changes should be checked against the vendor pricing pages before publication.
