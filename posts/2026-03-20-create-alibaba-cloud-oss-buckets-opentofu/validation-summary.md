# Validation Summary: How to Create Alibaba Cloud OSS Buckets with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform
- Alibaba Cloud (Aliyun)
- Object Storage Service (OSS)
- alicloud Terraform provider (`alicloud_oss_bucket`, `alicloud_oss_bucket_replication`)
- KMS (server-side encryption)
- HCL (HashiCorp Configuration Language)

## Sources Consulted
- Official `alicloud_oss_bucket` resource documentation: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/oss_bucket
- Source markdown for `alicloud_oss_bucket`: https://raw.githubusercontent.com/aliyun/terraform-provider-alicloud/master/website/docs/r/oss_bucket.html.markdown
- Source markdown for `alicloud_oss_bucket_replication`: https://raw.githubusercontent.com/aliyun/terraform-provider-alicloud/master/website/docs/r/oss_bucket_replication.html.markdown

## Issues Found

1. **Lifecycle rule used a non-existent `filter { prefix = ... }` schema.**
   - The blog wrapped `prefix` inside a `filter {}` block. In the alicloud provider, `prefix` is a top-level argument of `lifecycle_rule` (available since v1.90.0). The `filter` block exists but contains different fields (`not`, `object_size_greater_than`, `object_size_less_than`) and does not accept a direct `prefix` field.
   - Fix: moved `prefix = "logs/"` to be a top-level argument of `lifecycle_rule` and removed the `filter {}` wrapper. Also removed the redundant `created_before_date = null` from the first `transitions` block.

2. **`alicloud_oss_bucket_replication` example used an invalid schema.**
   - The original example wrapped everything in a non-existent `rule {}` block, treated `action` as a block (it is a string), put `replica_kms_key_id` inside `action` (it belongs in `encryption_configuration`), used a non-existent `sse_kms_encrypted_objects_status` field, and included a `status = "Enabled"` field that is not part of the resource schema.
   - Fix: rewrote the resource using the documented top-level arguments (`bucket`, `action`, `historical_object_replication`, `destination` block, `source_selection_criteria` block), per the official provider example.

## Review Notes
- The post does not configure a `provider "alicloud"` block or mention required credentials/region setup; readers will need that scaffolding before any of these resources will plan/apply.
- The `alicloud_oss_bucket_replication` resource typically also requires a `sync_role` (a RAM role that OSS assumes) for cross-region replication to work in production. The simplified example omits it; readers should consult the provider docs to wire up the role and policy.
- Storage class values for `transitions` are `IA`, `Archive`, `ColdArchive`, and `DeepColdArchive`. The post uses `IA` and `Archive`, which are correct.
- `cors_rule`, `website`, `versioning`, and `server_side_encryption_rule` blocks all match the documented schema.
- The `extranet_endpoint` attribute used in the output is valid per the resource's Attributes Reference.
