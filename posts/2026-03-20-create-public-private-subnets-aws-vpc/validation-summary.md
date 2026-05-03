# Validation Summary: How to Create Public and Private Subnets in an AWS VPC

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- AWS VPC (Virtual Private Cloud)
- AWS EC2 subnets (public and private)
- AWS Internet Gateway (IGW)
- AWS NAT Gateway
- AWS Elastic IP
- AWS Route Tables
- AWS CLI (ec2 service commands)
- IPv4 CIDR addressing (RFC 1918 private ranges)

## Sources Consulted
- AWS CLI Command Reference: `aws ec2 create-subnet` — https://docs.aws.amazon.com/cli/latest/reference/ec2/create-subnet.html
- AWS CLI Command Reference: `aws ec2 modify-subnet-attribute` — https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-subnet-attribute.html
- AWS CLI Command Reference: `aws ec2 create-internet-gateway` — https://docs.aws.amazon.com/cli/latest/reference/ec2/create-internet-gateway.html
- AWS CLI Command Reference: `aws ec2 attach-internet-gateway` — https://docs.aws.amazon.com/cli/latest/reference/ec2/attach-internet-gateway.html
- AWS CLI Command Reference: `aws ec2 create-route-table` / `create-route` / `associate-route-table` — https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route-table.html
- AWS CLI Command Reference: `aws ec2 allocate-address` — https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference: `aws ec2 create-nat-gateway` — https://docs.aws.amazon.com/cli/latest/reference/ec2/create-nat-gateway.html
- AWS VPC User Guide: subnet routing and public/private classification — https://docs.aws.amazon.com/vpc/latest/userguide/configure-subnets.html
- AWS VPC User Guide: NAT Gateway — https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- RFC 1918 (private IPv4 address space)

## Issues Found
No technical issues found. All AWS CLI commands, flags, query expressions, and routing concepts are correct and would work as described.

## Review Notes
- The `--domain vpc` flag on `aws ec2 allocate-address` is technically deprecated since EC2-Classic was retired in August 2022 (allocations are now VPC by default). It is still accepted by the CLI and remains commonly used in tutorials, so it is not incorrect. A future revision could omit it for cleaner output (avoids a deprecation warning).
- The Mermaid diagram uses `\n` for line breaks within node labels. This is supported in Mermaid v9+ (default in current renderers including GitHub). If targeting older renderers, `<br/>` would be more portable, but this is not a technical error.
- The comment "Associate public subnets" (plural) precedes a single `associate-route-table` call. Conceptually the example demonstrates the pattern; in practice you would repeat the command per public subnet. Not a technical error.
- The post correctly emphasizes that the public/private distinction is purely a function of route table configuration, and the production-readiness note about deploying one NAT Gateway per AZ is sound advice.
