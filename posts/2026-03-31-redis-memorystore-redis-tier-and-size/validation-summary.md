# Validation Summary: How to Choose Memorystore for Redis Tier and Size

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Memorystore for Redis
- gcloud CLI (redis instances create/update)
- Terraform (google_redis_instance resource)
- Python (memory estimation helper)

## Sources Consulted
- Google Cloud Memorystore for Redis documentation: https://cloud.google.com/memorystore/docs/redis
- Google Cloud Memorystore for Redis tier comparison: https://cloud.google.com/memorystore/docs/redis/redis-tiers
- Google Cloud Memorystore SLA: https://cloud.google.com/memorystore/sla
- gcloud redis instances create reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/create
- gcloud redis instances update reference: https://cloud.google.com/sdk/gcloud/reference/redis/instances/update
- Terraform google_redis_instance resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/redis_instance
- Memorystore read replicas documentation: https://cloud.google.com/memorystore/docs/redis/about-read-replicas

## Issues Found
1. **Python calculation comment was incorrect (line 51)**: The comment stated "Result: ~2.5 GB" but the actual output of the code is ~3.5 GB. The math: 10M keys * (50 + 200) bytes = 2.5 GB raw, multiplied by 1.5x overhead = 3.75 billion bytes / 1024^3 = ~3.5 GB. Fixed the comment to say "~3.5 GB".

2. **Available capacity sizes presented as a fixed list (lines 26-31)**: The blog listed a specific set of sizes as if those were the only available options. GCP documentation states that Memorystore instances can be any integer size from 1 GB to 300 GB. Updated the text to clarify that any integer size is valid, and the listed sizes are common examples.

## Review Notes
- The `--tier=STANDARD_HA` value used in the gcloud commands is the API enum value and works correctly, though some GCP documentation examples use the shorthand `--tier=STANDARD`. Both forms are accepted.
- The Terraform configuration correctly uses API enum values (`STANDARD_HA`, `REDIS_7_0`, `READ_REPLICAS_ENABLED`) which differ in casing from the gcloud CLI equivalents.
- The tier comparison table, SLA (99.9%), read replica limits (up to 5), and max capacity (300 GB) were all verified as accurate.
- The resizing claim (online, no downtime for Standard tier) is accurate for scaling up.
- Read replicas require a minimum instance size of 5 GB per node and Redis 5.0+, which is not mentioned in the post but is not critical for a high-level guide.
