# Validation Summary: How to Set Up Memorystore Redis Read Replicas

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Memorystore for Redis
- gcloud CLI (redis and monitoring commands)
- Terraform (google_redis_instance resource)
- Python (redis-py client library)
- Google Cloud Monitoring

## Sources Consulted
- Google Cloud Memorystore for Redis - About read replicas: https://cloud.google.com/memorystore/docs/redis/about-read-replicas
- Google Cloud Memorystore for Redis - Manage read replicas: https://cloud.google.com/memorystore/docs/redis/manage-read-replicas
- Google Cloud Memorystore for Redis - Supported monitoring metrics: https://cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics
- gcloud redis instances create reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/create
- gcloud monitoring reference: https://cloud.google.com/sdk/gcloud/reference/monitoring
- Terraform google_redis_instance resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/redis_instance

## Issues Found
1. **gcloud `--tier` flag used API enum instead of CLI value**: The `gcloud redis instances create` command used `--tier=STANDARD_HA` (the API/Terraform enum value). The gcloud CLI expects `--tier=standard` (lowercase). Fixed in both the create and update commands.

2. **gcloud `--read-replicas-mode` flag used API enum instead of CLI value**: The commands used `--read-replicas-mode=READ_REPLICAS_ENABLED` (API enum). The gcloud CLI expects `--read-replicas-mode=read-replicas-enabled` (lowercase, hyphenated). Fixed in both the create and update commands.

3. **Invalid monitoring command**: `gcloud monitoring metrics list` is not a valid gcloud CLI command. There is no gcloud CLI subcommand for listing metric descriptors. Replaced with `gcloud redis instances describe` to check replication info, and referenced the Cloud Console Metrics Explorer for metric monitoring.

4. **Incorrect replication metric name**: The metric `redis.googleapis.com/replication/offset` does not exist. The correct metric for monitoring replication lag is `redis.googleapis.com/replication/offset_diff` (bytes the replica is behind the primary). Updated the metric name and description.

## Review Notes
- The Terraform configuration correctly uses the API enum values (`STANDARD_HA`, `READ_REPLICAS_ENABLED`, `REDIS_7_0`) which differ from the gcloud CLI lowercase values — this is expected since Terraform uses the API directly.
- The Python code is correct and uses current redis-py APIs. The `str | None` type hint requires Python 3.10+.
- An alternative replication lag metric is `redis.googleapis.com/replication/master/slaves/lag` which reports lag in seconds rather than bytes — may be more intuitive for some use cases.
- The claim about "geographic distribution of cache reads" refers to zone-level distribution within a region, not cross-region distribution. Memorystore read replicas are zone-aware within the instance's region.
