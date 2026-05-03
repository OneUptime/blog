# Validation Summary: How to Deploy Memorystore (Redis) on GCP with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide (Infrastructure as Code)

## Technologies Covered
- OpenTofu / Terraform
- Google Cloud Memorystore for Redis (`google_redis_instance`)
- Google Cloud Memorystore for Redis Cluster (`google_redis_cluster`)
- Google Cloud VPC / Service Networking (Private Service Access)
- Google Cloud Secret Manager
- Google Cloud IAM (service accounts, roles)
- Google Cloud Compute Firewall rules

## Sources Consulted
- [Terraform Google Provider — google_redis_instance](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/redis_instance)
- [Terraform Google Provider — google_redis_cluster](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/redis_cluster)
- [Memorystore for Redis — Manage in-transit encryption](https://cloud.google.com/memorystore/docs/redis/manage-in-transit-encryption)
- [Memorystore for Redis — Connect to a Redis instance](https://cloud.google.com/memorystore/docs/redis/connect-redis-instance)
- [Memorystore for Redis — Tier capabilities and quotas](https://cloud.google.com/memorystore/docs/redis/redis-tiers)
- [Quickstart: Create a Memorystore for Redis instance using Terraform](https://cloud.google.com/memorystore/docs/cluster/create-instance-terraform)

## Issues Found
- **Invalid `node_type` value in `google_redis_cluster`**: The original comment listed `REDIS_HIGHMEM_LARGE` as an alternative value. The valid enum values are `REDIS_SHARED_CORE_NANO`, `REDIS_STANDARD_SMALL`, `REDIS_HIGHMEM_MEDIUM`, and `REDIS_HIGHMEM_XLARGE` — there is no `REDIS_HIGHMEM_LARGE`. Updated the comment to reflect the actual valid options.

## Review Notes
- TLS port `6378` for the standard Memorystore for Redis instance is correct (Memorystore for Redis exposes TLS on port `6378` and non-TLS on port `6379`). Note that this differs from Memorystore for Redis Cluster, which uses `6379` for both.
- `memory_size_gb` range of 1–300 GB applies to both `BASIC` and `STANDARD_HA` tiers, matching the post's comment.
- `tier`, `connect_mode`, `transit_encryption_mode`, `redis_version`, `auth_enabled`, `auth_string` attributes for `google_redis_instance` are all valid and current.
- `transit_encryption_mode = "TRANSIT_ENCRYPTION_MODE_SERVER_AUTHENTICATION"` and `authorization_mode = "AUTH_MODE_IAM_AUTH"` are valid enum values for `google_redis_cluster`.
- The `google_secret_manager_secret` `replication { auto {} }` block syntax is correct for the current provider versions.
- The IAM role `roles/redis.editor` is a valid predefined role.
