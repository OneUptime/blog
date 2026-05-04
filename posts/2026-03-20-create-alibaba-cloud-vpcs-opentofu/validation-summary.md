# Validation Summary: How to Create Alibaba Cloud VPCs with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu / Terraform (HCL)
- Alibaba Cloud VPC
- Alibaba Cloud VSwitch
- Alibaba Cloud NAT Gateway (Enhanced)
- Alibaba Cloud EIP (Elastic IP)
- Alibaba Cloud VPC Peering
- `aliyun/alicloud` Terraform provider

## Sources Consulted
- alicloud Terraform provider source: https://github.com/aliyun/terraform-provider-alicloud
- `alicloud_nat_gateway` docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/nat_gateway.html.markdown
- `alicloud_vpc_nat_ip` docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/vpc_nat_ip.html.markdown
- `alicloud_eip_association` docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/eip_association.html.markdown
- `alicloud_vpc_peer_connection` docs: https://github.com/aliyun/terraform-provider-alicloud/blob/master/website/docs/r/vpc_peer_connection.html.markdown
- alicloud `provider.go` resource registry confirming canonical resource names

## Issues Found
1. **Non-existent resource `alicloud_nat_gateway_nat_ip`**: The original NAT Gateway section used `alicloud_nat_gateway_nat_ip`, which is not a registered resource in the alicloud provider. The actual resource is `alicloud_vpc_nat_ip`. Beyond the wrong name, that resource also requires the CIDR block to be pre-configured on the NAT gateway via `alicloud_vpc_nat_ip_cidr` — so the example would have failed even with the corrected name. More importantly, the example created an EIP but never associated it with the NAT gateway, meaning the section ("Adding a NAT Gateway for Private VSwitches") would not have provided outbound internet access as the conclusion claims. Replaced the broken `alicloud_nat_gateway_nat_ip` block with an `alicloud_eip_association` resource (`instance_type = "Nat"`) so the EIP is properly bound to the Enhanced NAT Gateway.
2. **Misleading section header "VPC Peering (VPC Sharing)"**: VPC Peering and VPC Sharing are distinct Alibaba Cloud features. Peering uses `alicloud_vpc_peer_connection` to interconnect two VPCs; VPC Sharing is a Resource Access Manager (RAM) feature for sharing VPC resources across accounts. Renamed the section to simply "VPC Peering" to remove the conflation.

## Review Notes
- The remaining example code is consistent with the current `aliyun/alicloud` provider:
  - `alicloud_vpc` (`vpc_name`, `cidr_block`, `description`, `tags`) — correct.
  - `alicloud_zones` data source with `available_resource_creation = "VSwitch"` — correct.
  - `alicloud_vswitch` (`vswitch_name`, `vpc_id`, `cidr_block`, `zone_id`) — correct.
  - `alicloud_nat_gateway` with `nat_type = "Enhanced"`, `payment_type = "PayAsYouGo"`, and `vswitch_id` — correct (Enhanced NAT requires a vSwitch).
  - `alicloud_eip_address` (`address_name`, `payment_type`) — correct (the newer, recommended resource over the deprecated `alicloud_eip`).
  - `alicloud_vpc_peer_connection` field names (`peer_connection_name`, `vpc_id`, `accepting_ali_uid`, `accepting_region_id`, `accepting_vpc_id`) — all confirmed against the provider docs.
- For a fully working cross-account peering setup, the accepter side would also need an `alicloud_vpc_peer_connection_accepter` resource, but the post intentionally focuses on the requester-side configuration, so this is not flagged as an error.
- For complete outbound internet access from private VSwitches, an `alicloud_snat_entry` would still be needed on top of the now-corrected NAT gateway + EIP association, but the post limits scope to the gateway/EIP setup and does not claim to cover SNAT rules.
