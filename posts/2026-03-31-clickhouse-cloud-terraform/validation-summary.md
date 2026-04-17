# Validation Summary: How to Set Up ClickHouse Cloud with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ClickHouse Cloud
- Terraform
- ClickHouse Terraform Provider (`ClickHouse/clickhouse`)
- ClickHouse DB Ops Terraform Provider (`ClickHouse/clickhousedbops`)
- AWS VPC endpoints / S3 remote state backend

## Sources Consulted
- Terraform Registry - ClickHouse provider: https://registry.terraform.io/providers/ClickHouse/clickhouse/latest/docs
- GitHub - ClickHouse/terraform-provider-clickhouse: https://github.com/ClickHouse/terraform-provider-clickhouse
- `clickhouse_service` resource schema: https://raw.githubusercontent.com/ClickHouse/terraform-provider-clickhouse/main/docs/resources/service.md
- `clickhouse_private_endpoint_registration` resource schema: https://raw.githubusercontent.com/ClickHouse/terraform-provider-clickhouse/main/docs/resources/private_endpoint_registration.md
- `clickhouse_service_private_endpoints_attachment` resource schema: https://raw.githubusercontent.com/ClickHouse/terraform-provider-clickhouse/main/docs/resources/service_private_endpoints_attachment.md
- Official provider AWS basic example: https://github.com/ClickHouse/terraform-provider-clickhouse/tree/main/examples/full/basic/aws
- GitHub - ClickHouse/terraform-provider-clickhousedbops (`clickhousedbops_user`): https://github.com/ClickHouse/terraform-provider-clickhousedbops
- ClickHouse blog announcement of dbops provider: https://clickhouse.com/blog/new-terraform-provider-manage-clickhouse-database-users-roles-and-privileges-with-code

## Issues Found

1. **Outdated provider version constraint.** The post pinned `version = "~> 1.0"`, but the current major is `3.14.0` and several resources used later in the post (e.g. `clickhouse_private_endpoint_registration` with `private_endpoint_id`) require a 3.x release. Updated to `"~> 3.0"`.

2. **Deprecated memory attributes.** `min_total_memory_gb` / `max_total_memory_gb` are marked `Deprecated` in the provider schema in favor of per-replica sizing. Replaced with `min_replica_memory_gb = 12` / `max_replica_memory_gb = 120`.

3. **`tier` argument removed.** The provider schema states `tier` must be omitted for organizations on the new ClickHouse Cloud Tiers. Since this is the default for new organizations, the `tier = "production"` line was removed to keep the example valid out-of-the-box (matches the official `examples/full/basic/aws` example).

4. **`endpoints[0].host` was wrong.** The `endpoints` attribute is a nested object keyed by protocol (`https`, `mysql`, `nativesecure`), not a list. Changed `clickhouse_service.analytics.endpoints[0].host` to `clickhouse_service.analytics.endpoints.https.host`.

5. **`clickhouse_service_user` does not exist.** The `ClickHouse/clickhouse` provider does not contain a service-user resource. Database users are managed via the companion `ClickHouse/clickhousedbops` provider's `clickhousedbops_user` resource. Updated the snippet to use the correct resource and schema fields (`name`, `password_sha256_hash`) and added a one-line note pointing at the companion provider.

6. **Wrong private-endpoint resource name and field.** The post used `clickhouse_service_private_endpoint_registration` with an `id` argument. The correct resource is `clickhouse_private_endpoint_registration`, and the `id` argument is deprecated in favor of `private_endpoint_id`. Fixed both.

## Review Notes
- `clickhouse_private_endpoint_registration` itself is marked deprecated since provider 3.2.0, with migration guidance in the provider README. The post still demonstrates the correct modern spelling, but readers on the latest provider may want to follow the migration notes to the newer `clickhouse_service_private_endpoints_attachment` workflow.
- The S3 remote-state example uses valid Terraform syntax. For production use, enabling state locking (DynamoDB or the new S3 native locking introduced in Terraform 1.10+) would be worth mentioning in a future iteration, but it is out of scope for a correctness pass.
- The post's `password_sha256_hash` approach works for OpenTofu < 1.11; Terraform users on recent versions may prefer the write-only `password_sha256_hash_wo` / `password_sha256_hash_wo_version` pair to avoid storing password hashes in state. Both are currently supported, so the example is still correct.
