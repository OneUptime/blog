# Validation Summary: How to Configure an Internet Gateway for IPv4 Traffic in AWS VPC

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS VPC (Virtual Private Cloud)
- AWS Internet Gateway (IGW)
- AWS Route Tables
- AWS EC2
- AWS CLI v2
- IPv4 Networking
- AWS NAT Gateway (briefly mentioned)

## Sources Consulted
- AWS CLI Command Reference for EC2 — https://docs.aws.amazon.com/cli/latest/reference/ec2/
- `aws ec2 create-internet-gateway` — https://docs.aws.amazon.com/cli/latest/reference/ec2/create-internet-gateway.html
- `aws ec2 attach-internet-gateway` — https://docs.aws.amazon.com/cli/latest/reference/ec2/attach-internet-gateway.html
- `aws ec2 create-route-table` — https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route-table.html
- `aws ec2 create-route` — https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- `aws ec2 associate-route-table` — https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-route-table.html
- `aws ec2 describe-route-tables` — https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- AWS VPC User Guide — Internet Gateways — https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- AWS VPC User Guide — Route Tables — https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Route_Tables.html
- AWS VPC User Guide — NAT Gateways — https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html

## Issues Found
No technical issues found.

All AWS CLI commands use correct syntax, flag names, and JMESPath query paths:
- `create-internet-gateway` with `--tag-specifications` and `InternetGateway.InternetGatewayId` query are valid.
- `attach-internet-gateway` uses correct `--internet-gateway-id` and `--vpc-id` flags.
- `create-route` correctly uses `--gateway-id` for an IGW target (this flag accepts internet gateways and virtual private gateways; NAT Gateways would use `--nat-gateway-id`).
- `describe-route-tables` correctly uses the plural `--route-table-ids` flag.
- The detach-before-delete sequence for the IGW is required by AWS and is correctly demonstrated.

Conceptual claims are accurate:
- IGW provides bidirectional IPv4 connectivity (it also supports IPv6, but the post correctly scopes itself to IPv4).
- The 1:1 IGW-to-VPC attachment limit is correct.
- The criteria for a public subnet (route to IGW + instance with public IP) are correctly stated.
- NAT Gateway behavior (placed in public subnet, one-way outbound for private subnets) is correctly described.

## Review Notes
- The illustrative `describe-route-tables` table output uses the column header `DestinationCidr` while the actual AWS CLI table output uses `DestinationCidrBlock` and typically also includes an `Origin` column. This is clearly a simplified illustration of the concept rather than literal CLI output, so it has been left as-is.
- The `ping -c 3 8.8.8.8` connectivity test will only succeed if the instance's security group allows outbound ICMP (and inbound for echo replies, though stateful security groups handle this). Security group configuration is out of scope for this IGW-focused post but worth noting as a common gotcha.
- The conclusion mentions NAT Gateways for private subnets. For IPv6-only outbound, AWS provides Egress-Only Internet Gateways (EIGW), but since this post is scoped to IPv4, omitting EIGW is appropriate.
- The `--tag-specifications` JSON syntax used inline (single-quoted) is correct and works in bash; readers on Windows PowerShell or cmd may need to adjust quoting.
