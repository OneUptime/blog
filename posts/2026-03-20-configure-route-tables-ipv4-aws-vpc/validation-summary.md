# Validation Summary: How to Configure Route Tables for IPv4 Traffic in AWS VPC

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- AWS VPC (Virtual Private Cloud)
- AWS EC2 Route Tables
- AWS CLI (ec2 subcommands)
- IPv4 routing
- Internet Gateway (IGW)
- NAT Gateway
- VPC Peering
- Virtual Private Gateway (VGW) / VPN
- JMESPath query syntax (used in `--query` flag)

## Sources Consulted
- AWS CLI Reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- AWS CLI Reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route-table.html
- AWS CLI Reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/replace-route.html
- AWS CLI Reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/delete-route.html
- AWS CLI Reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-route-table.html
- AWS VPC User Guide: route table concepts and main route table behavior

## Issues Found
No technical issues found.

All AWS CLI commands, flags, and target identifiers verified against the official AWS CLI Reference:
- `describe-route-tables` with `--filters`, `--query`, `--output` — valid
- `create-route-table` with `--vpc-id`, `--tag-specifications` — valid
- `create-route` target flags (`--gateway-id` for IGW and VGW, `--nat-gateway-id`, `--vpc-peering-connection-id`) — all valid; using `--gateway-id` for a VGW is the correct AWS CLI convention (there is no separate `--vgw-id` flag)
- `associate-route-table` with `--route-table-id`, `--subnet-id` — valid
- `replace-route` — valid command, accepts the same target flags as `create-route`
- `delete-route` with `--route-table-id`, `--destination-cidr-block` — valid

Conceptual claims also verified:
- "Every subnet must be associated with exactly one route table" — correct per AWS VPC docs (subnets default to the main route table if not explicitly associated).
- The note that VPC peering and VGW routes are valid options, and best-practice guidance about per-AZ NAT Gateway routing for resilience, is accurate.

## Review Notes
- The JMESPath expression in `describe-route-tables --query` is valid; the use of backticks around `Name` for the literal string is correct JMESPath syntax.
- The example resource IDs (e.g. `vpc-0abc123def456`, `igw-0abc123`) are clearly illustrative placeholders.
- The post does not cover IPv6 routing targets (e.g. `--egress-only-internet-gateway-id`) or newer targets like Transit Gateway / Local Gateway / Carrier Gateway. This is acceptable given the post is explicitly scoped to IPv4 routing for IGW/NAT/peering/VPN, but a future expansion could mention Transit Gateway as the modern alternative for hybrid and multi-VPC connectivity.
- No deprecation warnings — all commands and flags are current as of the AWS CLI v2 reference at the time of review.
