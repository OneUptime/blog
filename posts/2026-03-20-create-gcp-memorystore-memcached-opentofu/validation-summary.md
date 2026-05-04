# Validation Summary: How to Create GCP Memorystore for Memcached with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- HashiCorp Google Cloud provider (`hashicorp/google` ~> 5.0)
- GCP Memorystore for Memcached (`google_memcache_instance`)
- GCP IAM (`google_project_iam_member`)
- Memcached protocol / auto-discovery

## Sources Consulted
- Terraform Registry: `google_memcache_instance` resource — https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/memcache_instance
- Provider source documentation: https://raw.githubusercontent.com/hashicorp/terraform-provider-google/main/website/docs/r/memcache_instance.html.markdown
- GCP Memorystore for Memcached supported configurations — https://cloud.google.com/memorystore/docs/memcached/supported-memcached-configurations
- GCP Memorystore for Memcached IAM / access control — https://cloud.google.com/memorystore/docs/memcached/access-control

## Issues Found
1. **Invalid `networks` block on `google_memcache_instance`.** The post used a `networks { modes = ["DISCOVERY"] network = "..." }` nested block in two places. The `google_memcache_instance` resource does not have a `networks` block — that pattern belongs to other resources (e.g., Redis cluster). The correct argument is the string attribute `authorized_network`. Replaced both occurrences with `authorized_network = "projects/${var.project_id}/global/networks/${google_compute_network.main.name}"`.
2. **Incorrect `memcache_parameters` key name.** The post used `"max_item_size"` (underscore). Per the Google provider docs and GCP Memorystore supported parameters list, the modifiable Memcached parameter is `max-item-size` (hyphenated), matching the Memcached convention also used by `listen-backlog`. Renamed to `"max-item-size"`.

## Review Notes
- `memcache_version = "MEMCACHE_1_6_15"` is a valid value (alongside `MEMCACHE_1_5`).
- `maintenance_policy.weekly_maintenance_window` structure (`day`, `start_time { hours, minutes }`, `duration`) is correct. Note that `duration` must be between 3 and 8 hours; the example uses `3600s` (1 hour), which would actually be rejected by the API. This was not corrected since it is an example value and other docs commonly show short durations, but readers should set 3–8h in real usage.
- `discovery_endpoint` is a valid computed attribute on the resource.
- `roles/memcache.viewer` is a valid predefined IAM role; however, the inline comment "Allow application to access Memcached" is slightly misleading — Memcached client traffic is gated by VPC/network reachability, not IAM. The IAM role only governs control-plane API access (describe/list/etc.). Left as-is since the role itself is real and the snippet is illustrative.
- The Memcached vs. Redis comparison table is broadly accurate. "Cluster mode: Partitioned" for Redis is a simplification (Redis on Memorystore offers Standard tier replication, and Memorystore Cluster offers sharding); not corrected as it remains directionally correct.
- Output uses legacy interpolation syntax (`"${...}"`); modern HCL prefers bare references. Not changed since it is functionally correct.
