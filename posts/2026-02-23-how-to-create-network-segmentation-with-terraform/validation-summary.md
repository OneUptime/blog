# Validation Summary: How to Create Network Segmentation with Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL, version 1.0+)
- AWS VPC, Subnets, Availability Zones
- AWS Network ACLs (NACLs)
- AWS Security Groups
- AWS Transit Gateway (route tables, VPC attachments, blackhole routes)
- AWS VPC Flow Logs
- AWS CloudWatch Logs
- AWS IAM (roles, trust policies, inline policies)
- Terraform `cidrsubnet()` function

## Sources Consulted
- Terraform AWS provider docs — `aws_vpc`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpc
- Terraform AWS provider docs — `aws_subnet`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/subnet
- Terraform AWS provider docs — `aws_network_acl`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/network_acl
- Terraform AWS provider docs — `aws_security_group`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- Terraform AWS provider docs — `aws_ec2_transit_gateway`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway
- Terraform AWS provider docs — `aws_ec2_transit_gateway_route_table`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route_table
- Terraform AWS provider docs — `aws_ec2_transit_gateway_route`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_route
- Terraform AWS provider docs — `aws_flow_log`: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/flow_log
- Terraform `cidrsubnet` function: https://developer.hashicorp.com/terraform/language/functions/cidrsubnet
- AWS docs — Network ACLs: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- AWS docs — Transit Gateway route tables: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html
- AWS docs — VPC Flow Logs publishing options: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs.html
- RFC 4632 (CIDR alignment requirements)

## Issues Found
- **Mis-aligned CIDR block `10.0.10.0/21` (6 occurrences in NACL rules)**: A /21 prefix has 11 host bits, requiring the network address to align on an 8-block boundary in the third octet (e.g., 10.0.0.0, 10.0.8.0, 10.0.16.0, ...). `10.0.10.0/21` is not a valid network address. AWS silently normalizes such input to the proper network boundary (`10.0.8.0/21`), which causes perpetual drift on every `terraform plan`. Replaced all 6 occurrences with `10.0.8.0/21`, which is the correct aligned CIDR covering the application subnets `10.0.10.0/24`, `10.0.11.0/24`, and `10.0.12.0/24` (range 10.0.8.0 – 10.0.15.255). The deny rule against `10.0.0.0/21` (public tier) was already correctly aligned and was left unchanged.

## Review Notes
- The Transit Gateway example references `aws_ec2_transit_gateway_vpc_attachment.shared_services` in the `prod_to_shared` route and `10.200.0.0/16` development CIDR in the blackhole route, but the corresponding `shared_services` and `development` VPC attachments are not defined in the snippet. This is acceptable as an illustrative excerpt of a larger configuration (the post explicitly says "For larger organizations, use separate VPCs for each workload"), but a reader who copies the block verbatim will need to supply those resources.
- The explicit NACL deny rule at `rule_no = 200` in the data tier is technically redundant — NACLs default-deny anything not explicitly allowed — but it is harmless and serves as defensive documentation of intent.
- `aws_flow_log.log_destination_type = "cloud-watch-logs"` and `max_aggregation_interval = 60` are both valid current values per the AWS API.
- The `aws_ec2_transit_gateway` arguments `default_route_table_association = "disable"` and `default_route_table_propagation = "disable"` are correct string values (not booleans).
- For `aws_network_acl` rules with `protocol = "-1"`, `from_port` and `to_port` must be present but are ignored by AWS; the `0`/`0` values used in the deny rule are conventional and acceptable.
- The cache security group at the data tier is tagged `Tier = "data"` but represents a Redis cache — this is a labeling choice rather than a technical error, and matches the data-tier NACL configuration that allows port 6379.
