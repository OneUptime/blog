# Validation Summary: How to Fix VPC NAT Gateway Connectivity Issues

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Amazon VPC
- AWS NAT Gateway
- Internet Gateway
- VPC route tables
- Network ACLs
- Security groups
- Elastic IP addresses
- Amazon CloudWatch NAT Gateway metrics
- AWS CLI

## Sources Consulted
- AWS VPC User Guide: NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- AWS VPC User Guide: NAT gateway basics - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- AWS VPC User Guide: Troubleshoot NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-troubleshooting.html
- AWS VPC User Guide: Monitor NAT gateways with Amazon CloudWatch - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway-cloudwatch.html
- AWS VPC User Guide: NAT gateway metrics and dimensions - https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html
- AWS VPC User Guide: Subnet route tables - https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html
- AWS VPC User Guide: Internet gateway basics - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS VPC User Guide: Network ACLs - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html
- AWS VPC User Guide: Custom network ACLs and ephemeral ports - https://docs.aws.amazon.com/vpc/latest/userguide/custom-network-acl.html
- AWS CLI Command Reference: create-route - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Command Reference: describe-route-tables - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- AWS CLI Command Reference: describe-nat-gateways - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-nat-gateways.html
- AWS CLI Command Reference: create-network-acl-entry - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-network-acl-entry.html

## Issues Found
- The post stated that a single NAT Gateway supports up to 45 Gbps. AWS documentation now states that NAT Gateway supports 5 Gbps and automatically scales up to 100 Gbps. Updated the bandwidth claim.
- The route-table lookup examples only checked explicit subnet route-table associations. AWS CLI documentation notes that implicit main route table associations do not return the subnet ID. Added a fallback command and notes to check the VPC main route table.
- The post described the connection limit as 55,000 simultaneous connections to a single destination. AWS documents this as 55,000 simultaneous connections per IPv4 address to each unique destination. Updated the wording and added secondary IPv4 addresses as a mitigation.
- The post said each NAT Gateway requires an Elastic IP. AWS distinguishes public and private NAT gateways; public NAT gateways require Elastic IP addresses. Updated the wording to specify public NAT gateways.

## Review Notes
The AWS CLI examples use placeholder resource IDs and should be replaced with real IDs before execution. The network ACL examples are intentionally minimal and IPv4-focused; production environments may also need IPv6, ICMP, DNS, and application-specific rules.
