# Validation Summary: How to Configure AWS Site-to-Site VPN IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS Site-to-Site VPN
- AWS Transit Gateway
- Amazon VPC IPv6
- AWS CLI
- Terraform AWS Provider
- BGP

## Sources Consulted
- AWS Site-to-Site VPN: IPv4 and IPv6 traffic in AWS Site-to-Site VPN - https://docs.aws.amazon.com/vpn/latest/s2svpn/ipv4-ipv6.html
- AWS Site-to-Site VPN: Create an AWS Site-to-Site VPN connection - https://docs.aws.amazon.com/vpn/latest/s2svpn/create-vpn-connection.html
- AWS CLI: `create-customer-gateway` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-customer-gateway.html
- AWS CLI: `create-vpn-connection` - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-connection.html
- AWS CLI: `associate-vpc-cidr-block` - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-vpc-cidr-block.html
- AWS CLI: `associate-subnet-cidr-block` - https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-subnet-cidr-block.html
- AWS CLI: `modify-subnet-attribute` - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-subnet-attribute.html
- Amazon VPC: Example routing options - https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- AWS Transit Gateway: AWS Site-to-Site VPN attachments in AWS Transit Gateway - https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpn-attachments.html
- AWS CLI: `enable-transit-gateway-route-table-propagation` - https://docs.aws.amazon.com/cli/latest/reference/ec2/enable-transit-gateway-route-table-propagation.html
- AWS CLI: `search-transit-gateway-routes` - https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html
- Terraform AWS Provider: `aws_vpn_connection` - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/vpn_connection

## Issues Found
- The post implied Site-to-Site VPN IPv6 could be configured generically on AWS, but AWS supports IPv6 VPN traffic only on transit gateway or Cloud WAN attachments, not on a virtual private gateway. I corrected the tutorial to use a transit gateway-based VPN flow.
- Step 2 used `describe-vpc-attribute` as if it enabled IPv6, but that command only reads an attribute and does not configure IPv6. I replaced it with the VPC and subnet IPv6 association commands plus subnet IPv6 auto-assignment.
- Step 3 used `aws directconnect create-private-virtual-interface`, which configures Direct Connect, not Site-to-Site VPN. I replaced it with `create-customer-gateway` and `create-vpn-connection` commands that apply to AWS Site-to-Site VPN.
- Step 4 routed `::/0` to an internet gateway, which would route IPv6 internet traffic rather than on-premises VPN traffic. I changed the route target to a transit gateway and added transit gateway route propagation for the VPN attachment.
- Step 5 verified VPC route tables instead of the transit gateway route table that carries propagated VPN routes in this design. I changed the verification command to `search-transit-gateway-routes`.
- The Terraform example used `vpn_gateway_id`, but AWS does not support IPv6 Site-to-Site VPN traffic on a virtual private gateway. I updated the example to use `transit_gateway_id` with `tunnel_inside_ip_version = "ipv6"`.
- The conclusion implied a single VPN connection could be treated as dual-stack for inner traffic. I corrected the post to note that separate Site-to-Site VPN connections are required if you need both IPv4 and IPv6 traffic.

## Review Notes
- The tutorial now reflects the supported AWS pattern for IPv6 traffic over Site-to-Site VPN as of 2026-05-07.
- The Terraform example is intentionally limited to IPv6 traffic inside the tunnels. If you also want IPv6 outer tunnel IPs, verify your current AWS provider version supports the required `outside_ip_address_type` setting before adding it.
