# Validation Summary: Dual-Stack Routing Through AWS Transit Gateway

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- AWS Transit Gateway and Transit Gateway route tables
- Amazon VPC dual-stack IPv4/IPv6 networking
- AWS Site-to-Site VPN
- AWS Direct Connect and BGP
- Internet gateways, egress-only internet gateways, NAT64, DNS64, and centralized IPv6 egress
- Stateful inspection, security groups, network ACLs, and flow logs
- Terraform AWS Provider resources
- IPv6 diagnostics with `dig`, `curl`, `ping`, and `tracepath`

## Sources Consulted
- Amazon VPC attachments in AWS Transit Gateway: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- How AWS Transit Gateway works: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- IP addressing for your VPCs and subnets: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-ip-addressing.html
- IPv4 and IPv6 traffic in AWS Site-to-Site VPN: https://docs.aws.amazon.com/vpn/latest/s2svpn/ipv4-ipv6.html
- Direct Connect virtual interfaces and hosted virtual interfaces: https://docs.aws.amazon.com/directconnect/latest/UserGuide/WorkingWithVirtualInterfaces.html
- Add a BGP peer to a Direct Connect virtual interface: https://docs.aws.amazon.com/directconnect/latest/UserGuide/add-peer-to-vif.html
- Create a transit virtual interface to a Direct Connect gateway: https://docs.aws.amazon.com/directconnect/latest/UserGuide/create-transit-vif-for-gateway.html
- Allowed prefixes interactions for Direct Connect gateways: https://docs.aws.amazon.com/directconnect/latest/UserGuide/allowed-to-prefixes.html
- Monitor Direct Connect with Amazon CloudWatch: https://docs.aws.amazon.com/directconnect/latest/UserGuide/monitoring-cloudwatch.html
- Enable outbound IPv6 traffic using an egress-only internet gateway: https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- DNS64 and NAT64: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-nat64-dns64.html
- Centralized egress for IPv6: https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/centralized-egress-for-ipv6.html
- AWS Transit Gateway Flow Logs: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html
- Configure security group rules: https://docs.aws.amazon.com/vpc/latest/userguide/working-with-security-group-rules.html
- Custom network ACLs for your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- Network maximum transmission unit for EC2: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/network_mtu.html
- HashiCorp AWS Provider `aws_ec2_transit_gateway_vpc_attachment` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/ec2_transit_gateway_vpc_attachment
- HashiCorp AWS Provider `aws_route` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/route
- RFC 8200, Internet Protocol, Version 6 Specification: https://www.rfc-editor.org/rfc/rfc8200.html
- RFC 4890, Recommendations for Filtering ICMPv6 Messages in Firewalls: https://www.rfc-editor.org/rfc/rfc4890.html
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052.html
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849.html
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/latest/manpages.html#dig-dns-lookup-utility
- curl command-line tool man page: https://curl.se/docs/manpage.html
- iputils `ping` source and command implementation: https://github.com/iputils/iputils/blob/master/ping/ping.c
- iputils `tracepath` source and command implementation: https://github.com/iputils/iputils/blob/master/tracepath.c
- iputils `tracepath` manual: https://www.man7.org/linux/man-pages/man8/tracepath.8.html

## Issues Found
- The attachment-subnet guidance said to use "IPv4-capable or dual-stack" subnets. IPv6 support requires an IPv6 CIDR on every selected attachment subnet, while Transit Gateway attachments cannot use IPv6-only subnets, so the selected subnets must be dual-stack. Updated the sentence accordingly.
- The egress section described native IPv6 addresses as universally public. AWS now supports private IPv6 ULA and GUA ranges through IPAM, and AWS drops those ranges at the internet gateway edge. Scoped the egress-only internet gateway pattern to public IPv6 workloads and added the private-IPv6 limitation.
- The documentation list linked to the AWS "IPv6 on AWS" whitepaper, which AWS marks as historical and which contains outdated attachment behavior that conflicts with the current Transit Gateway documentation. Replaced it with the current Amazon VPC IP-addressing documentation.

## Review Notes
The Terraform resource arguments and values are current and syntactically valid. The shell commands are valid for systems with BIND utilities, curl, and Linux iputils installed; `tracepath6` is supported by iputils as an IPv6-selecting alias. The `2001:db8::/32` addresses are RFC 3849 documentation examples and must be replaced with deployed prefixes for operational tests. No product versions are pinned, so the review used current service and provider documentation as of the validation date.
