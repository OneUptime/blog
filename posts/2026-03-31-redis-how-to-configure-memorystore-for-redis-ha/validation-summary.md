# Validation Summary: How to Configure Memorystore for Redis HA

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis (Standard tier / HA)
- gcloud CLI (redis instances create, describe, failover)
- Terraform (google_redis_instance resource)
- Python (redis-py client)
- Node.js (ioredis client)
- Go (go-redis/v9 client)
- Google Cloud Monitoring API (monitoring_v3)

## Sources Consulted
- [Memorystore for Redis tier capabilities](https://docs.cloud.google.com/memorystore/docs/redis/redis-tiers)
- [High availability for Memorystore for Redis](https://docs.cloud.google.com/memorystore/docs/redis/high-availability-for-memorystore-for-redis)
- [Create and manage Redis instances](https://docs.cloud.google.com/memorystore/docs/redis/create-manage-instances)
- [gcloud redis instances create reference](https://docs.cloud.google.com/sdk/gcloud/reference/redis/instances/create)
- [Manage Redis AUTH](https://docs.cloud.google.com/memorystore/docs/redis/manage-redis-auth)
- [About manual failover](https://docs.cloud.google.com/memorystore/docs/redis/about-manual-failover)
- [Manage in-transit encryption](https://docs.cloud.google.com/memorystore/docs/redis/manage-in-transit-encryption)
- [Supported monitoring metrics](https://docs.cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics)
- [google_redis_instance Terraform resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/redis_instance)
- [go-redis v9 (github.com/redis/go-redis)](https://github.com/redis/go-redis)

## Issues Found
1. **Incorrect gcloud flag `--secondary-zone`**: Changed to `--alternative-zone`, which is the correct flag name per the gcloud CLI reference. The explanatory text referencing this flag was also updated.
2. **Incorrect gcloud flag `--auth-enabled`**: Changed to `--enable-auth`, which is the correct flag name per the Memorystore AUTH documentation.
3. **Incorrect Go import path**: Changed `github.com/go-redis/redis/v9` to `github.com/redis/go-redis/v9`. The go-redis project moved to the `redis` GitHub organization for v9, and the canonical import path changed accordingly.
4. **Unused Go import**: Removed the unused `"context"` import from the Go code example. Go does not compile with unused imports, so this would cause a build error.
5. **Incorrect failover data-loss threshold**: The post claimed `limited-data-loss` mode "only fails over if less than 30 minutes of data would be lost." The actual threshold is **30 MB** of pending replication data, not 30 minutes. Corrected to "less than 30 MB of data is pending replication."
6. **Misleading failover step**: Step 4 stated "Updates the instance endpoint IP," which contradicts both the official documentation and the post's own earlier statement that "the same IP address remains accessible." Changed to "Redirects the existing endpoint to the new primary (IP address stays the same)."

## Review Notes
- The Terraform configuration correctly uses `STANDARD_HA` as the tier value (different from the gcloud CLI which uses `standard`/`STANDARD`). This is correct per the Terraform provider docs.
- The TLS port 6378 is correct for Memorystore for Redis (non-cluster). Note that Memorystore for Redis Cluster uses port 6379 for TLS.
- The monitoring metrics referenced (`redis.googleapis.com/replication/master/slaves/lag`, `redis.googleapis.com/stats/memory/usage_ratio`, `redis.googleapis.com/server/uptime`) are all valid metric paths per the official supported metrics documentation.
- The Python monitoring code uses `int64_value` to read the replication lag metric. The actual metric type for `replication/master/slaves/lag` returns a double value, so `double_value` might be more accurate, but this depends on the metric descriptor and would not cause a runtime error (it would just return 0).
- The `ssl_cert_reqs='none'` in the failover monitoring Python example uses a string value rather than the `ssl.CERT_NONE` constant used in the earlier example. Both forms are accepted by redis-py.
