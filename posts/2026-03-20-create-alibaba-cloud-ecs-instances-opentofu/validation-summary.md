# Validation Summary: How to Create Alibaba Cloud ECS Instances with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- Alibaba Cloud ECS (Elastic Compute Service)
- `aliyun/alicloud` Terraform/OpenTofu provider
- Alibaba Cloud VPC and VSwitch (networking)
- Alibaba Cloud Security Groups
- ECS Key Pairs
- cloud-init / user-data scripting

## Sources Consulted
- `alicloud_vpc` resource: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/vpc
- `alicloud_vswitch` resource: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/vswitch
- `alicloud_zones` data source: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/data-sources/zones
- `alicloud_ecs_key_pair` resource: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/ecs_key_pair
- `alicloud_images` data source: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/data-sources/images
- `alicloud_instance` resource: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/instance
- `alicloud_security_group` resource: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/security_group
- `alicloud_security_group_rule` resource: https://registry.terraform.io/providers/aliyun/alicloud/latest/docs/resources/security_group_rule
- Alibaba Cloud ECS instance type families documentation

## Issues Found
- **`alicloud_security_group` used the deprecated `name` argument.** As of provider version v1.239.0, `name` is deprecated in favor of `security_group_name`. Updated the security group resource to use `security_group_name` instead. The `name` argument still works but produces a deprecation warning during plan/apply.

## Review Notes
- All other resource arguments and data source filters were verified against the official `aliyun/alicloud` provider documentation and are correct, including: `alicloud_vpc.vpc_name`, `alicloud_vswitch.vswitch_name`, `alicloud_zones.available_resource_creation = "VSwitch"`, `alicloud_ecs_key_pair.key_pair_name`, `alicloud_images.owners = "system"` (string, not list), and `alicloud_instance.key_name` (which is correctly `key_name` on the instance resource — distinct from `key_pair_name` on the key pair resource).
- `user_data` is correctly wrapped with `base64encode()` — this matches the documented best practice.
- `system_disk_category = "cloud_essd"` is a valid disk category.
- `nic_type = "intranet"` is correct for VPC-based security group rules.
- `port_range` format `"80/80"` is correct (start/end format).
- All listed ECS instance types (`ecs.t6-c1m1.large`, `ecs.c6.large`, `ecs.c6.xlarge`, `ecs.g6.large`, `ecs.r6.large`) are real Alibaba Cloud instance types with correct vCPU/RAM specifications.
- The post's note that "EIP attachment is preferred for production" for stable public addresses is technically sound advice — `internet_max_bandwidth_out` allocates a non-persistent public IP that is released when the instance is destroyed, while an EIP can be detached and re-attached.
