# Validation Summary: How to Set Up Memorystore Redis with Standard Tier for High Availability

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud CLI
- Cloud Monitoring alerting policies
- Redis Standard Tier high availability and failover
- redis-py
- ioredis

## Sources Consulted
- Google Cloud Memorystore for Redis high availability: https://docs.cloud.google.com/memorystore/docs/redis/high-availability-for-memorystore-for-redis
- Google Cloud Memorystore for Redis tier capabilities: https://docs.cloud.google.com/memorystore/docs/redis/redis-tiers
- Google Cloud Memorystore for Redis pricing: https://cloud.google.com/memorystore/docs/redis/pricing
- Google Cloud Memorystore for Redis supported monitoring metrics: https://docs.cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics
- Google Cloud Memorystore for Redis manual failover: https://docs.cloud.google.com/memorystore/docs/redis/about-manual-failover
- Google Cloud CLI `gcloud redis instances create`: https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create
- Google Cloud CLI `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Memorystore for Redis REST instance fields: https://docs.cloud.google.com/memorystore/docs/redis/reference/rest/v1/projects.locations.instances
- redis-py production usage and retry documentation: https://redis.io/docs/latest/develop/clients/redis-py/produsage/
- ioredis options documentation: https://redis.github.io/ioredis/interfaces/CommonRedisOptions.html

## Issues Found
- The post described failover as a DNS update and said the instance IP points to the new primary. Google documents reconnection through the same connection string or IP address, with the primary endpoint redirected. Updated the wording and diagram label.
- The Basic vs Standard comparison used "Data persistence" language that could imply durable persistence. Standard Tier provides replica-based failover, but acknowledged writes can still be lost because replication is asynchronous. Reworded the table row to "Failure recovery."
- The Node.js retry example claimed exponential backoff but used a linear delay. Updated the formula to exponential backoff.
- Several Cloud Monitoring metric names were incorrect or outdated. Replaced them with the documented Memorystore metric types for connected clients, rejected connections, and bytes pending replication.
- The alerting policy command used `--condition-threshold-value`, which is not a current `gcloud monitoring policies create` flag. Replaced it with `--if='> 1000000'` and added `--duration=60s`.
- The manual failover description overstated `force-data-loss` as immediately promoting the replica. Updated it to match Google's documented behavior: it skips the offset check and uses a more aggressive failover path.
- The sizing section stated that a Standard Tier instance is billed as exactly two times the per-GB price. Google bills Standard Tier instances with read replicas disabled by provisioned capacity at the Standard Tier per-GiB price. Updated the cost formula and softened the cost table.

## Review Notes
The `gcloud` SDK was not installed in the local environment, so CLI validation was performed against the official Google Cloud CLI reference rather than local `--help` output. The Python and Node.js client libraries were also not installed locally, so client examples were checked against official redis-py and ioredis documentation.
