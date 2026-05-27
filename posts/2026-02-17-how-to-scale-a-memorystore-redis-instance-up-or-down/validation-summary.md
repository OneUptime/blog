# Validation Summary: How to Scale a Memorystore Redis Instance Up or Down

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- Google Cloud CLI (`gcloud redis` and `gcloud monitoring`)
- Cloud Monitoring metrics and alerting policies
- Redis CLI and Redis `INFO` command
- Python `redis-py`

## Sources Consulted
- Google Cloud Memorystore for Redis scaling behavior: https://docs.cloud.google.com/memorystore/docs/redis/about-scaling-instances
- Google Cloud Memorystore for Redis scale instances guide: https://cloud.google.com/memorystore/docs/redis/scale-instances
- Google Cloud SDK `gcloud redis instances update` reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/update
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Memorystore for Redis supported monitoring metrics: https://docs.cloud.google.com/memorystore/docs/redis/supported-monitoring-metrics
- Google Cloud Memorystore for Redis monitor instances guide: https://docs.cloud.google.com/memorystore/docs/redis/monitor-instances
- Google Cloud Memorystore for Redis pricing: https://cloud.google.com/memorystore/docs/redis/pricing
- Google Cloud Memorystore for Redis tiers: https://docs.cloud.google.com/memorystore/docs/redis/redis-tiers
- Redis `INFO` command documentation: https://redis.io/docs/latest/commands/info/
- Redis Python client production usage documentation: https://redis.io/docs/latest/develop/clients/redis-py/produsage/

## Issues Found
- The Cloud Monitoring alert examples used `--condition-threshold-value` and `--condition-comparison`, which are not valid flags for the current `gcloud monitoring policies create` command. Replaced them with the documented `--if` flag and added `--duration=60s`.
- The Standard Tier scaling explanation described a specific node-by-node sequence that is not stated in current Google Cloud documentation. Reworded it to the documented behavior: replication and failover reduce disruption, but applications should still handle a short connection reset.
- The connection disruption estimate for Standard Tier said 30-60 seconds. Google documents a short connection reset of a couple minutes or less, so the post now uses that wording.
- The billing section said Memorystore is billed per GB-hour and that Standard Tier costs roughly 2x because of primary plus replica. Current pricing is billed in 1-second increments based on provisioned GiB, and read replica node-based charges apply only when read replicas are enabled. Updated the wording.
- The monthly Standard Tier cost examples were materially higher than current us-central1 on-demand pricing. Updated the examples to approximately $93/month for 2 GiB, $197/month for 5 GiB, and $394/month for 10 GiB, using 730 hours per month.

## Review Notes
- `gcloud` is not installed in this environment, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output.
- The Python examples are syntactically valid under Python 3, but the cleanup example is intentionally illustrative and still requires replacing placeholder host/auth values and choosing safe key patterns for a real application.
