# Validation Summary: How to Configure AUTH Authentication for Memorystore Redis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Redis AUTH
- Google Cloud CLI
- Secret Manager
- GKE / Kubernetes secrets
- Cloud Run secrets
- redis-py
- ioredis
- go-redis
- Jedis

## Sources Consulted
- Google Cloud Memorystore for Redis AUTH overview: https://cloud.google.com/memorystore/docs/redis/about-redis-auth
- Google Cloud Memorystore for Redis AUTH management: https://cloud.google.com/memorystore/docs/redis/manage-redis-auth
- Google Cloud CLI `gcloud redis instances create`: https://cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud CLI `gcloud redis instances update`: https://cloud.google.com/sdk/gcloud/reference/redis/instances/update
- Google Cloud CLI `gcloud redis instances get-auth-string`: https://cloud.google.com/sdk/gcloud/reference/redis/instances/get-auth-string
- Google Cloud Logging monitored resource types: https://cloud.google.com/logging/docs/api/v2/resource-list
- Redis Python client documentation: https://redis.io/docs/latest/develop/clients/redis-py/
- ioredis documentation: https://github.com/redis/ioredis
- go-redis documentation: https://redis.io/docs/latest/integrate/go-redis/
- Jedis documentation: https://redis.io/docs/latest/develop/clients/jedis/

## Issues Found
- The post said the AUTH string is typically 50+ characters. Google Cloud documents the Memorystore for Redis AUTH string as a randomly generated 36-character UUID, so the description was corrected.
- The post implied enabling AUTH only affects new connections. Google Cloud documents that existing unauthenticated connections must authenticate before they can continue issuing commands, so the wording was corrected.
- The migration flow tried to retrieve and deploy the AUTH string before enabling AUTH. `gcloud redis instances get-auth-string` returns an empty result when AUTH is disabled, so the rollout order was corrected to deploy AUTH-capable code first, then enable AUTH, retrieve the string, update secrets, and restart clients.
- The post described a two-phase AUTH rotation where both old and new auth strings remain valid. Memorystore for Redis does not document that behavior; changing the AUTH string is done by disabling and re-enabling AUTH, which invalidates the old string and disrupts authenticated client connections. The rotation explanation and commands were corrected.
- The rotation commands used `--update-redis-config=AUTH=new` and `AUTH=complete`, but `AUTH` is not a supported Redis config key for Memorystore instance updates. Those commands were replaced with the documented `--no-enable-auth` / `--enable-auth` sequence.
- The automated rotation script retrieved the AUTH string without first generating a new one. It now disables and re-enables AUTH before retrieving and distributing the new string.

## Review Notes
The client library snippets use standard password options for Redis clients and are technically valid as short examples. AUTH does not encrypt traffic and does not replace VPC access controls; the introduction was adjusted to avoid overstating its security properties.
