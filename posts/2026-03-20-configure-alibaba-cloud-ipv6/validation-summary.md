# Validation Summary: How to Configure Alibaba Cloud VPC with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Alibaba Cloud VPC
- Alibaba Cloud ECS
- Alibaba Cloud CLI
- Terraform
- IPv6 networking
- Alibaba Cloud security groups

## Sources Consulted
- Alibaba Cloud CLI quick start: https://help.aliyun.com/zh/cli/quickly-start-using-alibaba-cloud-cli
- Alibaba Cloud CLI plugin model: https://help.aliyun.com/zh/cli/cloud-products-supporting-cli
- VPC and VSwitch IPv6 behavior: https://help.aliyun.com/zh/vpc/vpc-and-vswitch
- ModifyVpcAttribute API: https://help.aliyun.com/zh/vpc/developer-reference/api-vpc-2016-04-28-modifyvpcattribute
- CreateVSwitch API: https://help.aliyun.com/zh/vpc/developer-reference/api-vpc-2016-04-28-createvswitch
- CreateIpv6Gateway API: https://help.aliyun.com/zh/vpc/developer-reference/api-vpc-2016-04-28-createipv6gateway
- IPv6 Gateway overview: https://help.aliyun.com/zh/ipv6-gateway/product-overview/what-is-an-ipv6-gateway/
- Terraform `alicloud_vpc`: https://help.aliyun.com/zh/terraform/alicloud-vpc
- Terraform `alicloud_vswitch`: https://help.aliyun.com/zh/terraform/alicloud-vswitch
- Terraform `alicloud_instance`: https://help.aliyun.com/zh/terraform/alicloud-instance
- Terraform `alicloud_vpc_ipv6_gateway`: https://help.aliyun.com/zh/terraform/alicloud-vpc-ipv6-gateway
- Terraform `alicloud_vpc_ipv6_internet_bandwidth`: https://help.aliyun.com/zh/terraform/alicloud-vpc-ipv6-internet-bandwidth
- Terraform `alicloud_vpc_ipv6_addresses`: https://help.aliyun.com/zh/terraform/alicloud-vpc-ipv6-addresses
- Terraform `alicloud_security_group`: https://help.aliyun.com/zh/terraform/alicloud-security-group
- Terraform `alicloud_security_group_rule`: https://help.aliyun.com/zh/terraform/alicloud-security-group-rule
- Ubuntu public image catalog for ECS: https://help.aliyun.com/zh/ecs/ubuntu-image

## Issues Found
- The CLI installation step used `pip install aliyun-cli`, which does not match current Alibaba Cloud CLI documentation. I replaced it with the official installer guidance and added the current CLI 3.3.0+ plugin requirement.
- The post implied IPv6 enablement via CLI/Terraform was sufficient for internet access, but Alibaba Cloud documents that API/CLI/Terraform flows do not auto-create the IPv6 gateway. I clarified this in the introduction and added the missing `CreateIpv6Gateway` CLI step.
- The Terraform VSwitch example omitted `enable_ipv6 = true`, which is part of the documented dual-stack VSwitch configuration. I added it.
- The Terraform example hardcoded an old Ubuntu 22.04 image ID from 2023. I replaced the fixed image ID with a data source that selects the most recent Ubuntu 22.04 system image and added zone and instance-type data sources so the example is less likely to fail.
- The Terraform IPv6 gateway example used `spec`, but the provider documents `spec` as deprecated and no longer used. I removed it.
- The Terraform IPv6 bandwidth example passed `alicloud_instance.web.ipv6_addresses[0]` as `ipv6_address_id`, but the resource requires the IPv6 address resource ID, not the raw IPv6 literal. I added `data "alicloud_vpc_ipv6_addresses"` and used its address ID.
- The Terraform IPv6 bandwidth example referenced the gateway with `.id`; the provider examples use the explicit `ipv6_gateway_id` attribute. I updated the example to use `alicloud_vpc_ipv6_gateway.gw.ipv6_gateway_id`.
- The security group example used deprecated `name` on `alicloud_security_group`. I updated it to `security_group_name`.
- The security group rule set both `cidr_ip` and `ipv6_cidr_ip`, but the provider docs state these cannot be used together. I removed the invalid `cidr_ip`.
- The verification example used `curl -6` against `2001:4860:4860::8888`, which is Google Public DNS and not an HTTP endpoint. I replaced it with a valid IPv6 HTTP connectivity check and made the `ip -6` examples less interface-name-specific.

## Review Notes
- The post is technically valid after the corrections above.
- The CLI example now reflects the current plugin-based CLI model, but users working in Cloud Shell or with preinstalled plugins may not need the plugin installation step every time.
- The verification commands are intentionally generic because interface names and route output vary by guest OS image.
