# Validation Summary: How to Generate Random UUIDs with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (>= 1.5.0)
- HashiCorp Random Provider (~> 3.6) — `random_uuid` resource
- HashiCorp AWS Provider (~> 5.0)
- AWS resources: SSM Parameter Store, ECS, RDS (Aurora PostgreSQL), ElastiCache (Redis), S3, Resource Groups
- RFC 4122 (UUID specification)

## Sources Consulted
- HashiCorp Random Provider docs — `random_uuid`: https://registry.terraform.io/providers/hashicorp/random/latest/docs/resources/uuid
- Terraform AWS Provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS `aws_ssm_parameter`, `aws_ecs_cluster`, `aws_rds_cluster`, `aws_elasticache_cluster`, `aws_s3_bucket`, `aws_resourcegroups_group` resource documentation
- RFC 4122 — A Universally Unique IDentifier (UUID) URN Namespace: https://www.rfc-editor.org/rfc/rfc4122
- AWS Resource Groups query syntax (TAG_FILTERS_1_0): https://docs.aws.amazon.com/ARG/latest/APIReference/about-query-strings.html

## Issues Found
No technical issues found.

Verified items:
- `random_uuid` is a real resource in the `hashicorp/random` provider; it produces RFC 4122 version 4 UUIDs and exposes `result` and `id` attributes (both equal to the generated UUID).
- The illustrative UUID `a1b2c3d4-e5f6-4890-abcd-ef1234567890` is a syntactically valid v4 form: 8-4-4-4-12 hex layout, leading `4` in the third group (version), and a leading `a` in the fourth group (a valid RFC 4122 variant: 8, 9, a, or b).
- `keepers` is the correct mechanism for triggering UUID regeneration when any tracked value changes.
- All AWS resource blocks use valid resource types and attribute names for AWS provider 5.x (e.g., `cluster_identifier`, `master_username`/`master_password` on `aws_rds_cluster`, `skip_final_snapshot`, `cluster_id`/`engine`/`node_type`/`num_cache_nodes` on `aws_elasticache_cluster`).
- `aws_resourcegroups_group` `resource_query.query` uses the correct JSON shape (`ResourceTypeFilters`, `TagFilters` with `Key`/`Values`); omitting `type` is valid since it defaults to `TAG_FILTERS_1_0`.
- S3 bucket naming `tenant-${uuid}` (~43 chars, lowercase hex + hyphens) stays within S3's 3–63 character constraint and uses only allowed characters.
- HCL syntax (provider blocks, `for_each = toset(...)`, `merge(...)`, `jsonencode(...)`, output `for` comprehension) is correct.

## Review Notes
- The post uses an example `master_password = "temporary-change-me"` for `aws_rds_cluster`. This is clearly labeled as temporary, but real deployments should source secrets from AWS Secrets Manager / SSM SecureString / Vault, not plaintext.
- `aws_elasticache_cluster` with `engine = "redis"` is supported, but newer guidance from AWS favors `aws_elasticache_replication_group` for production Redis. This is not incorrect — just a stylistic note.
- The `random_uuid` resource produces a value at plan/apply time; values change on `terraform destroy` + re-apply unless persisted externally. The post's framing around `keepers` correctly addresses this.
- Tagging resources with a UUID that's keyed off `keepers` causing a tag change will trigger downstream resource updates (`tags` change). The current examples are fine since the keepers are stable per environment/version, but readers should be aware that changing a keeper input forces re-tagging on all consumers.
