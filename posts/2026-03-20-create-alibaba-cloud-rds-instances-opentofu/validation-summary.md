# Validation Summary: How to Create Alibaba Cloud RDS Instances with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform
- Alibaba Cloud RDS (ApsaraDB for RDS)
- MySQL on Alibaba Cloud
- PostgreSQL on Alibaba Cloud
- aliyun/alicloud Terraform provider
- Read/write splitting connection
- HCL configuration

## Sources Consulted
- [alicloud_db_instance resource docs](https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/db_instance)
- [alicloud_db_instance source markdown](https://github.com/hashicorp/terraform-provider-alicloud/blob/master/website/docs/r/db_instance.html.markdown)
- [alicloud_db_database resource docs](https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/db_database)
- [alicloud_rds_account resource docs](https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/rds_account)
- [alicloud_db_account_privilege resource docs](https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/db_account_privilege)
- [alicloud_db_read_write_splitting_connection source markdown](https://github.com/hashicorp/terraform-provider-alicloud/blob/master/website/docs/r/db_read_write_splitting_connection.html.markdown)
- [Alibaba Cloud RDS for MySQL primary instance types](https://www.alibabacloud.com/help/en/rds/apsaradb-rds-for-mysql/primary-apsaradb-rds-for-mysql-instance-types)

## Issues Found
1. **Incorrect resource name in the read/write splitting example.** The post used `alicloud_read_write_splitting_connection`, which does not exist. The correct provider resource is `alicloud_db_read_write_splitting_connection` (with the `db_` prefix). Renamed accordingly.
2. **Misuse of the `weight` argument with `distribution_type = "Standard"`.** The provider docs state the `weight` map is only required (and meaningful) when `distribution_type = "Custom"`; with `Standard`, weights are auto-distributed. The original example also assigned weight `100` (number) to the master instance only, which is not a valid Custom weight configuration (Custom weights must be string values and typically span a master plus its read-only replicas). Since the surrounding example uses `Standard` distribution, the simplest correct fix is to remove the `weight` block; this leaves a valid, working example that demonstrates the read/write splitting endpoint with automatic weight distribution.

## Review Notes
- `alicloud_db_instance` arguments used in the post (`engine`, `engine_version`, `instance_type`, `instance_storage`, `instance_name`, `vswitch_id`, `security_ips`, `tags`, `db_time_zone`, `instance_charge_type`, `zone_id`, `zone_id_slave_a`) are all valid per the official provider documentation. `zone_id_slave_a` is available since provider version 1.101.0.
- `connection_string` is a valid exported attribute of `alicloud_db_instance`.
- `account_type` values `Normal` and `Super` are correct for `alicloud_rds_account`.
- `privilege` value `ReadWrite` for `alicloud_db_account_privilege` is correct for MySQL.
- `character_set = "utf8mb4"` is a valid value for MySQL on `alicloud_db_database`.
- Instance classes `rds.mysql.s2.large`, `rds.mysql.c1.large`, and `pg.n2.2xlarge.2` exist in the Alibaba RDS class catalog, but `s2`/`c1` are older generations that may be phased out for new purchases in some regions. Readers may need to substitute a current-generation class (e.g., from the `mysql.x4`/`mysql.n2`/`mysql.x8` families) when applying the example. Not changed because the general pattern is still correct.
- The post does not show a `provider "alicloud"` block, `terraform { required_providers { ... } }`, the `alicloud_vswitch.private_a` referenced by `vswitch_id`, the `data "alicloud_zones" "available"` referenced in the HA example, or the `var.db_password` declaration. These omissions are consistent with the post's snippet-style format but readers will need to supply them to apply the configuration end-to-end.
- The "Read-Only Replica" section actually demonstrates a read/write splitting endpoint, which only distributes traffic across already-existing read-only instances (created via `alicloud_db_readonly_instance`). The section header is slightly misleading but the code itself is now syntactically valid; left as-is to respect the author's structure.
