# Validation Summary: How to Set Up a VPN Between AWS VPC and On-Premises Networks (IPv4)

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Site-to-Site VPN
- Amazon VPC
- Virtual private gateway
- Customer gateway
- AWS CLI for Amazon EC2
- IPv4 networking
- IPsec VPN tunnels
- Static VPN routing and route propagation

## Sources Consulted
- AWS Site-to-Site VPN: What is AWS Site-to-Site VPN? https://docs.aws.amazon.com/vpn/latest/s2svpn/VPC_VPN.html
- AWS Site-to-Site VPN: How AWS Site-to-Site VPN works https://docs.aws.amazon.com/vpn/latest/s2svpn/how_it_works.html
- AWS Site-to-Site VPN: Get started with AWS Site-to-Site VPN https://docs.aws.amazon.com/vpn/latest/s2svpn/SetUpVPNConnections.html
- AWS Site-to-Site VPN: Static and dynamic routing https://docs.aws.amazon.com/vpn/latest/s2svpn/vpn-static-dynamic.html
- AWS CLI Command Reference: create-customer-gateway https://docs.aws.amazon.com/cli/latest/reference/ec2/create-customer-gateway.html
- AWS CLI Command Reference: create-vpn-gateway https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-gateway.html
- AWS CLI Command Reference: attach-vpn-gateway https://docs.aws.amazon.com/cli/latest/reference/ec2/attach-vpn-gateway.html
- AWS CLI Command Reference: create-vpn-connection https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-connection.html
- AWS CLI Command Reference: create-vpn-connection-route https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpn-connection-route.html
- AWS CLI Command Reference: enable-vgw-route-propagation https://docs.aws.amazon.com/cli/latest/reference/ec2/enable-vgw-route-propagation.html
- AWS CLI Command Reference: describe-vpn-connections https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-vpn-connections.html

## Issues Found
- The introduction described AWS Site-to-Site VPN as creating a single encrypted IPsec tunnel. AWS documents that each Site-to-Site VPN connection includes two VPN tunnels, so the wording was changed to "two encrypted IPsec tunnels."
- The customer gateway example used the deprecated AWS CLI `--public-ip` option. The command was updated to use the current `--ip-address` option.
- The verification step suggested testing with ping without noting the required inbound traffic permissions. The sentence was updated to state that ICMP must be allowed from the on-premises CIDR in the instance security group, network ACLs, and host firewall.

## Review Notes
The remaining AWS CLI commands and options match the current official AWS CLI command reference. The local environment did not have the AWS CLI installed, so command validation was performed against the official AWS documentation rather than local `aws --help` output.
