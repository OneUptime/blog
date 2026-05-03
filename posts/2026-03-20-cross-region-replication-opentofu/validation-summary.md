# Validation Summary: How to Configure Cross-Region Replication with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide (Infrastructure-as-Code recipes)

## Technologies Covered
- OpenTofu / Terraform (HCL)
- AWS RDS (PostgreSQL) cross-region read replicas
- AWS DynamoDB Global Tables (v2019.11.21)
- AWS KMS (per-region key management)
- AWS ElastiCache Global Datastore (Redis)
- Azure SQL Database with `azurerm_mssql_failover_group`
- Google Cloud Storage (multi-region, dual-region, Turbo Replication)
- `hashicorp/aws` provider, `hashicorp/azurerm` provider, `hashicorp/google` provider

## Sources Consulted
- Terraform AWS provider, `aws_db_instance` (cross-region replica via `replicate_source_db` ARN): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/db_instance.html.markdown
- Terraform AWS provider, `aws_dynamodb_table` replicas / streams: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/dynamodb_table
- Terraform AWS provider, `aws_elasticache_replication_group` (current `description` field, `num_cache_clusters`): https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/elasticache_replication_group.html.markdown
- Terraform AWS provider, `aws_elasticache_global_replication_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/elasticache_global_replication_group
- Terraform azurerm provider, `azurerm_mssql_failover_group` (`read_write_endpoint_failover_policy`, `grace_minutes`): https://github.com/hashicorp/terraform-provider-azurerm/blob/main/website/docs/r/mssql_failover_group.html.markdown
- Terraform google provider, `google_storage_bucket` (`storage_class`, `custom_placement_config`, `rpo`): https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/storage_bucket
- Google Cloud Storage classes (legacy `MULTI_REGIONAL` vs `STANDARD`): https://cloud.google.com/storage/docs/storage-classes
- Google Cloud Storage bucket locations (predefined dual-regions like NAM4 vs configurable dual-regions): https://cloud.google.com/storage/docs/locations
- Google Cloud Storage Turbo Replication (`rpo = "ASYNC_TURBO"`): https://cloud.google.com/storage/docs/turbo-replication

## Issues Found

1. **GCS multi-region bucket used the legacy `MULTI_REGIONAL` storage class.** Google's storage class docs describe `MULTI_REGIONAL` as a legacy class equivalent to `STANDARD`; new buckets should use `STANDARD` with the location determining regional vs multi-regional behavior. **Changed `storage_class = "MULTI_REGIONAL"` to `storage_class = "STANDARD"`.**

2. **GCS dual-region bucket mixed `location = "NAM4"` (a predefined dual-region) with `custom_placement_config`.** `custom_placement_config` is only used for *configurable* dual-regions (where `location` is a multi-region code like `"US"`). Furthermore, the specific `US-CENTRAL1` + `US-EAST1` pairing is only available as the predefined NAM4 dual-region — it cannot be expressed as a configurable dual-region. **Removed the `custom_placement_config` block; kept `location = "NAM4"` as the predefined dual-region.**

3. **The "Dual-region with Turbo Replication" example did not actually enable Turbo Replication.** Turbo Replication requires the bucket-level `rpo = "ASYNC_TURBO"` field; without it, the bucket falls back to the default async replication (~12-hour RPO), not the advertised sub-15-minute RPO. **Added `rpo = "ASYNC_TURBO"` to the dual_region bucket.**

4. **The comment on the multi-region bucket misstated Turbo's requirements** (claimed it requires `custom_placement_config`). Turbo Replication only requires a dual-region bucket — predefined dual-regions like NAM4 work just fine. **Edited the comment to point to the dual-region example below instead.**

## Review Notes
- **AWS RDS cross-region replica:** `replicate_source_db = aws_db_instance.primary.arn` is correct — cross-region read replicas require the source DB ARN (same-region replicas can use the identifier).
- **DynamoDB Global Tables:** `stream_view_type = "NEW_AND_OLD_IMAGES"` is correctly required for the v2019.11.21 Global Tables feature used by the inline `replica` blocks.
- **Azure SQL `grace_minutes = 60`:** Azure's API enforces a minimum of 1 hour. The provider docs don't explicitly state the minimum, but 60 minutes (= 1 hour) is the floor in practice. The user-facing comment "Wait 60 minutes before auto-failover" is a slight oversimplification — `grace_minutes` is the grace period before *forced failover with potential data loss* if the primary stays unreachable, not a fixed countdown — but it's acceptable for an introductory example.
- **AWS ElastiCache `engine = "redis"`, `engine_version = "7.0"`:** Both are valid for ElastiCache. Note that ElastiCache now also supports Valkey (`engine = "valkey"`); future readers may want to consider Valkey for new deployments, though Redis 7.0 remains supported.
- **Cross-region KMS key handling:** The post's emphasis on per-region KMS keys (RDS replica, DynamoDB replicas, etc.) is correct — KMS keys are regional resources and cannot be referenced cross-region.
- **`backup_retention_period = 0` on RDS replica:** Valid; disables automated backups on the replica. Some teams prefer to keep replica backups enabled for additional protection — worth a future note but not incorrect.
