# Validation Summary: How to Create GCP Memorystore for Redis with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC)
- Google Cloud Platform (GCP)
- GCP Memorystore for Redis (`google_redis_instance`)
- GCP VPC Networking (`google_compute_network`, `google_compute_global_address`)
- GCP Service Networking (`google_service_networking_connection`)
- HashiCorp `google` provider (~> 5.0)
- Redis 7.0

## Sources Consulted
- Terraform Registry — `google_redis_instance`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/redis_instance
- Terraform Registry — `google_compute_global_address`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/compute_global_address
- Terraform Registry — `google_service_networking_connection`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/service_networking_connection
- Google Cloud Memorystore for Redis documentation: https://cloud.google.com/memorystore/docs/redis
- Google Cloud Memorystore — Redis versions: https://cloud.google.com/memorystore/docs/redis/supported-versions
- Google Cloud — Connecting to Redis via Private Service Access: https://cloud.google.com/memorystore/docs/redis/networking

## Issues Found
No technical issues found.

All resource arguments, attribute names, valid enum values, and output attributes match the official `hashicorp/google` provider documentation:

- `tier` values (`BASIC`, `STANDARD_HA`) are correct.
- `redis_version = "REDIS_7_0"` is a valid Memorystore-supported version.
- `connect_mode` values (`DIRECT_PEERING`, `PRIVATE_SERVICE_ACCESS`) are correct.
- `transit_encryption_mode = "SERVER_AUTHENTICATION"` is a valid enum.
- `read_replicas_mode = "READ_REPLICAS_ENABLED"` and `replica_count` are valid; `STANDARD_HA` and adequate memory size (8 GB used) satisfy the prerequisites for read replicas.
- `maintenance_policy.weekly_maintenance_window` block structure (with `day` and nested `start_time { hours, minutes }`) matches the schema.
- `redis_configs` accepts the listed Redis runtime options (`maxmemory-policy`, `notify-keyspace-events`).
- `google_compute_global_address` with `purpose = "VPC_PEERING"`, `address_type = "INTERNAL"`, and `prefix_length` is the documented pattern for service networking allocations.
- `google_service_networking_connection` with `service = "servicenetworking.googleapis.com"` and `reserved_peering_ranges` referencing the allocation name is correct.
- The output attributes `host`, `port`, and `auth_string` are all valid exported attributes; marking `auth_string` as `sensitive` is appropriate.

## Review Notes
- The post references `google_compute_network.main` without showing its definition; readers will need to provide their own VPC resource. This is reasonable for a focused tutorial but worth noting.
- `var.project_id` is referenced but the variable declaration is not shown. Standard for tutorial-length posts.
- `auth_enabled` works for both `BASIC` and `STANDARD_HA` tiers. `transit_encryption_mode = "SERVER_AUTHENTICATION"` (in-transit encryption) is supported on both tiers as well.
- Read replicas (`READ_REPLICAS_ENABLED`) require `STANDARD_HA` and a minimum memory size; the example using 8 GB easily meets this. Future readers scaling down should be aware of the per-replica-count memory minimums documented by Google.
- The `prefix_length = 16` for the private IP allocation is on the larger side; many production setups use `/20` or `/24` depending on how many service-networking-backed services are deployed. Not incorrect, just generous.
- `~> 5.0` version constraint for the google provider is current and appropriate as of the post's date.
