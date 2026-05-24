# Validation Summary: How to Create GCP Memorystore Redis with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud Platform (GCP)
- GCP Memorystore for Redis
- Redis 7.0
- GCP VPC / Private Service Access
- Service Networking
- `google_redis_instance` Terraform resource
- `google_compute_global_address` Terraform resource
- `google_service_networking_connection` Terraform resource

## Sources Consulted
- Terraform Registry — `google_redis_instance` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/redis_instance
- Google Cloud Memorystore for Redis REST API reference (`projects.locations.instances`): https://cloud.google.com/memorystore/docs/redis/reference/rest/v1/projects.locations.instances
- Google Cloud Memorystore for Redis docs (supported Redis versions, tiers, connect modes, redis_configs)
- Terraform Registry — `google_service_networking_connection` and `google_compute_global_address`

## Issues Found
1. **Incorrect `reserved_ip_range` value for `PRIVATE_SERVICE_ACCESS` connect mode** (Standard Tier with High Availability section).
   - Original: `reserved_ip_range = "10.0.0.0/28"` was used alongside `connect_mode = "PRIVATE_SERVICE_ACCESS"`.
   - Per the Memorystore REST API reference, when `connect_mode = "PRIVATE_SERVICE_ACCESS"`, `reserved_ip_range` must be the **name** of an allocated IP range (a `google_compute_global_address` resource), not a CIDR block. A CIDR value is only valid for `DIRECT_PEERING` mode.
   - Fix: Removed the `reserved_ip_range = "10.0.0.0/28"` line (and its preceding comment) from the Standard Tier example so the configuration is correct. The dedicated "Private Service Access" section later in the post already shows the proper pattern of creating the `google_compute_global_address` and `google_service_networking_connection` and letting the service auto-allocate from the named range.

## Review Notes
- The `google_redis_instance` resource, `tier` values (`BASIC`, `STANDARD_HA`), `redis_version = "REDIS_7_0"`, `connect_mode` values, `transit_encryption_mode = "SERVER_AUTHENTICATION"`, `auth_enabled`, `read_replicas_mode = "READ_REPLICAS_ENABLED"`, `replica_count` (1–5), and `maintenance_policy { weekly_maintenance_window { start_time { ... } } }` block structure all match the current Terraform provider schema.
- Supported `redis_configs` parameters include `maxmemory-policy`, `notify-keyspace-events`, and `activedefrag` — all used correctly in the post.
- Output attributes `host`, `port`, `read_endpoint`, and `auth_string` are valid exported attributes of `google_redis_instance`. Marking `auth_string` and the connection URL as `sensitive = true` is correct.
- `google_compute_global_address` with `purpose = "VPC_PEERING"`, `address_type = "INTERNAL"`, and `prefix_length = 16` is functionally valid, though `/16` is quite large for a peering reservation; smaller ranges (e.g., `/20` or `/24`) are typically sufficient. Left as-is since the post's value is not incorrect.
- The claim that Memorystore disables `CONFIG`, `CLUSTER`, and `DEBUG` administrative commands is accurate.
- The Redis 7.0 version reference is current as of the post's date; newer versions (e.g., REDIS_7_2) are also available and could be mentioned in future revisions.
