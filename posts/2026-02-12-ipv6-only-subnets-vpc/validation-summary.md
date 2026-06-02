# Validation Summary: How to Set Up IPv6-Only Subnets in VPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon VPC
- IPv6-only subnets
- AWS CLI for EC2/VPC
- DNS64 and NAT64
- NAT gateways
- Egress-only internet gateways
- CloudFormation
- EC2 security groups
- EC2 instance metadata service
- AWS Systems Manager Agent

## Sources Consulted
- AWS VPC User Guide: DNS64 and NAT64: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-nat64-dns64.html
- AWS CLI Command Reference: create-subnet: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-subnet.html
- AWS CloudFormation Reference: AWS::EC2::Subnet: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-subnet.html
- AWS VPC User Guide: Subnets for your VPC: https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html
- AWS VPC User Guide: Modify the IP addressing attributes of your subnet: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-public-ip.html
- AWS EC2 User Guide: Use the Instance Metadata Service to access instance metadata: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-instance-metadata-service.html
- AWS Systems Manager User Guide: Tutorial: Patching a server in an IPv6 only environment: https://docs.aws.amazon.com/systems-manager/latest/userguide/patch-manager-server-patching-iPv6-tutorial.html
- AWS VPC Pricing: https://aws.amazon.com/vpc/pricing/
- RFC 6052: IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052

## Issues Found
1. The introduction said IPv6-only subnets mean "no more NAT gateways for outbound IPv4 traffic." AWS NAT64 requires routing synthesized IPv6 destinations through a NAT gateway for IPv4-only destinations, so I changed this to say IPv6-only reduces NAT gateway dependency for native IPv6 traffic.

2. The NAT64 setup described the NAT gateway as being created "with IPv6" and said it must be in a dual-stack public subnet. AWS documents NAT64 as automatically available on NAT gateways and states the NAT gateway subnet does not need to be dual-stack. I changed the wording to "for NAT64" and scoped the requirement to a public subnet with IPv4 internet access.

3. The CLI example enabled auto-assign IPv6 addresses only for the first IPv6-only subnet. I added the matching `modify-subnet-attribute --assign-ipv6-address-on-creation` command for the second subnet.

4. The CloudFormation subnets omitted `AssignIpv6AddressOnCreation` even though the guide says instances receive IPv6 addresses automatically. I added `AssignIpv6AddressOnCreation: true` to both `AWS::EC2::Subnet` resources, matching AWS's IPv6 subnet examples and subnet attribute documentation.

5. The IMDS note overstated that the endpoint is available regardless of subnet IP version. AWS documents the IPv6 IMDS endpoint `[fd00:ec2::254]` as available on Nitro-based instances in IPv6-supported subnets, and IPv6-only subnets also have IPv4 link-local behavior. I updated the note to reflect those conditions.

6. The AWS services compatibility note said "most" AWS services support IPv6. AWS documents "many" services with IPv6 support and notes that other services have limited or partial support. I changed "Most" to "Many."

7. The SSM Agent note said Systems Manager Agent works on IPv6-only instances without qualification. AWS documents IPv6-only patching support with SSM Agent version 3.3270.0 or later and dual-stack endpoint configuration when needed. I added that version/configuration caveat.

## Review Notes
The examples use placeholder resource IDs, CIDR blocks, AMI IDs, and security group IDs; these are syntactically plausible but must be replaced with account-specific values. The NAT64 route table pattern, DNS64 subnet attribute, CloudFormation property names, and `64:ff9b::/96` well-known prefix are consistent with AWS documentation and RFC 6052.
