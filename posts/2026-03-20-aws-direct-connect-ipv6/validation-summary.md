# Validation Summary: How to Configure AWS Direct Connect IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Direct Connect
- Amazon VPC
- IPv6
- BGP
- AWS CLI
- Terraform AWS Provider

## Sources Consulted
- AWS Direct Connect User Guide: Create a Direct Connect private virtual interface - https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-private-vif.html
- AWS CLI Command Reference: `create-private-virtual-interface` - https://docs.aws.amazon.com/cli/latest/reference/directconnect/create-private-virtual-interface.html
- AWS CLI Command Reference: `describe-virtual-interfaces` - https://docs.aws.amazon.com/cli/latest/reference/directconnect/describe-virtual-interfaces.html
- Amazon VPC User Guide: Add IPv6 support for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-migrate-ipv6-add.html
- AWS CLI Command Reference: `associate-vpc-cidr-block` - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-vpc-cidr-block.html
- AWS CLI Command Reference: `associate-subnet-cidr-block` - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-subnet-cidr-block.html
- Amazon VPC User Guide: Example routing options - https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- AWS CLI Command Reference: `enable-vgw-route-propagation` - https://docs.aws.amazon.com/cli/latest/reference/ec2/enable-vgw-route-propagation.html
- Terraform AWS Provider docs source: `aws_dx_private_virtual_interface` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/dx_private_virtual_interface.html.markdown

## Issues Found
- The prerequisites used `VPC/VNet`, which mixes AWS and Azure terminology. I corrected this to `VPC` and clarified that a Direct Connect connection is also required.
- Step 2 used `describe-vpc-attribute --attribute enableDnsSupport`, which does not enable IPv6. I replaced it with the correct VPC and subnet IPv6 CIDR association commands.
- Step 3 attempted to create an IPv6 private VIF with empty `amazonAddress` and `customerAddress` values. For IPv6 private VIF BGP peers, AWS auto-assigns the peer IPv6 addresses, so those fields should be omitted.
- Step 4 routed `::/0` to an internet gateway, which is for internet-bound IPv6 traffic and not for Direct Connect private VIF routing to on-premises networks. I replaced it with virtual private gateway route propagation.
- Step 5 described a route-table query as verifying a learned route, but it did not check Direct Connect BGP state. I added a `describe-virtual-interfaces` example to verify the IPv6 BGP peer status and adjusted the route-table check wording.
- Step 6 used `aws_vpn_connection`, which configures Site-to-Site VPN rather than AWS Direct Connect. I replaced it with the correct `aws_dx_private_virtual_interface` Terraform resource configured for IPv6.
- The introduction and conclusion were tightened so they describe Direct Connect private IPv6 connectivity to VPC resources more accurately.

## Review Notes
- The command and Terraform examples are now scoped to a private VIF attached to a virtual private gateway. A Direct Connect gateway-based design uses a slightly different attachment workflow.
- In Terraform, `aws_vpn_gateway` is the provider resource name for an AWS virtual private gateway, which is valid in a Direct Connect private VIF example even though the name includes `vpn`.
