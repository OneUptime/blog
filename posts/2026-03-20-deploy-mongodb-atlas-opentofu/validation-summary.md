# Validation Summary: How to Deploy MongoDB Atlas with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu / Terraform
- MongoDB Atlas (managed MongoDB service)
- MongoDB Atlas Terraform Provider (`mongodb/mongodbatlas` v1.x)
- AWS VPC Peering
- AWS IAM (database authentication)

## Sources Consulted
- MongoDB Atlas Terraform Provider v1.41.1 docs — `mongodbatlas_advanced_cluster`: https://github.com/mongodb/terraform-provider-mongodbatlas/blob/v1.41.1/docs/resources/advanced_cluster.md
- MongoDB Atlas Terraform Provider v1.41.1 docs — `mongodbatlas_network_peering`: https://github.com/mongodb/terraform-provider-mongodbatlas/blob/v1.41.1/docs/resources/network_peering.md
- MongoDB Atlas Terraform Provider v1.41.1 docs — `mongodbatlas_project`: https://github.com/mongodb/terraform-provider-mongodbatlas/blob/v1.41.1/docs/resources/project.md
- MongoDB Atlas Terraform Provider v1.41.1 docs — `mongodbatlas_database_user`: https://github.com/mongodb/terraform-provider-mongodbatlas/blob/v1.41.1/docs/resources/database_user.md
- MongoDB Atlas Terraform Provider v1.41.1 docs — `mongodbatlas_project_ip_access_list`: https://github.com/mongodb/terraform-provider-mongodbatlas/blob/v1.41.1/docs/resources/project_ip_access_list.md
- Provider source schema for `mongodbatlas_network_peering`: https://github.com/mongodb/terraform-provider-mongodbatlas/blob/v1.41.1/internal/service/networkpeering/resource_network_peering.go

## Issues Found

1. **Incorrect `container_id` reference for network peering (critical).**
   The original post wrote `container_id = mongodbatlas_advanced_cluster.main.replication_specs[0].region_configs[0].provider_name`. That expression resolves to the literal string `"AWS"`, not a container ID, so the apply would fail with an invalid container ID. Per the provider docs, `replication_specs.#.container_id` is a map keyed by `"providerName:regionName"`. Replaced the value with `one(values(mongodbatlas_advanced_cluster.main.replication_specs[0].container_id))`, matching the official AWS peering example.

2. **Required `instance_size` set to `null` in `analytics_specs` (would fail validation).**
   The original post used `instance_size = var.environment == "prod" ? "M10" : null` inside an `analytics_specs` block. The provider schema marks `instance_size` as required when the block is present, so the non-prod branch would error. Set the value unconditionally to `"M10"` while keeping the `node_count = var.environment == "prod" ? 1 : 0` ternary, which correctly disables analytics nodes outside prod.

## Review Notes
- The post pins the provider to `~> 1.0`; the v1.x block syntax (`replication_specs { region_configs { electable_specs { ... } } }`) used throughout matches v1.x docs. Note that MongoDB Atlas Provider v2.0.0 introduces a breaking change to a list/object syntax (e.g. `replication_specs = [{ region_configs = [{ electable_specs = { ... } }] }]`) and also removes `num_shards`. Readers upgrading will need the official 2.0 migration guide.
- `num_shards` inside `replication_specs` is still accepted in v1.x but is deprecated in favour of one `replication_specs` entry per shard.
- `disk_size_gb` at the top level of `mongodbatlas_advanced_cluster` is deprecated since 1.18.0 in favour of the per-spec `disk_size_gb` — the post does not set it, so this is fine.
- The IAM-based database user uses an inline ARN string. The provider docs also accept an `aws_iam_role.<name>.arn` reference; either works.
- The `provider_name` field is set on `mongodbatlas_network_peering`, which is required and correct for AWS, but `accepter_region_name` here uses `var.aws_region` (e.g. `us-east-1`). The provider accepts the standard AWS region format for this attribute, so this is correct (different from the `region_name` on the cluster which uses Atlas's `US_EAST_1` style).
