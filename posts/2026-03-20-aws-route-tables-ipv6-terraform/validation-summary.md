# Validation Summary: How to Configure AWS Route Tables for IPv6 with Terraform

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS VPC route tables
- AWS IPv6 and dual-stack VPC networking
- AWS Internet Gateway and Egress-Only Internet Gateway
- AWS Transit Gateway
- AWS VPC peering
- Terraform AWS provider
- AWS CLI
- Linux `iproute2` and `ping`

## Sources Consulted
- Amazon VPC User Guide: Example routing options - https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- Amazon VPC User Guide: Enable outbound IPv6 traffic using an egress-only internet gateway - https://docs.aws.amazon.com/vpc/latest/userguide/egress-only-internet-gateway.html
- Amazon VPC Peering Guide: Update your route tables for a VPC peering connection - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-routing.html
- Amazon VPC Peering Guide: VPC peering configurations with specific routes - https://docs.aws.amazon.com/vpc/latest/peering/peering-configurations-partial-access.html
- Amazon VPC Peering Guide: How VPC peering connections work - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
- Amazon VPC Transit Gateways: How AWS Transit Gateway works - https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- Amazon VPC Transit Gateways: Transit gateway route tables - https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html
- AWS CLI v2 Command Reference: `describe-route-tables` - https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html
- Terraform AWS Provider docs: `aws_route_table` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route_table.html.markdown
- Terraform AWS Provider docs: `aws_route` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/route.html.markdown
- Terraform AWS Provider docs: `aws_egress_only_internet_gateway` - https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/egress_only_internet_gateway.html.markdown

## Issues Found
- The original post mixed inline `route {}` blocks in `aws_route_table` with standalone `aws_route` resources for the same table. The Terraform AWS provider documentation explicitly warns against combining those patterns, so the Terraform examples were corrected to use standalone `aws_route` resources consistently.
- The VPC peering IPv6 example used `fd00:peer::/56`, which is not a valid IPv6 CIDR string. It was replaced with a syntactically valid documentation prefix example, `2001:db8:1234:1a00::/56`.
- The Transit Gateway example used `::/0` as a "specific" IPv6 route even though the private route table already had an IPv6 default route to the egress-only internet gateway. That example was corrected to use a more specific IPv6 prefix routed through the transit gateway.
- The private route table comment said the IPv4 route was "one per AZ" while the example referenced a single `aws_nat_gateway.main.id`. The wording was corrected to avoid implying a per-AZ design that the snippet did not implement.
- The verification command depended on an undefined Terraform output `public_rt_id`. It was corrected to use an AWS CLI route-table filter that matches the example's `Name` tag and to query only IPv6 routes.
- The instance-side verification notes were too specific to one Linux interface naming scheme and used `ping6`, which is less portable than `ping -6`. The commands and comments were corrected to reflect current Linux tooling more accurately.

## Review Notes
- The routing guidance is correct only if the VPC and subnets already have IPv6 CIDR blocks associated and the EC2 instances actually have IPv6 addresses assigned.
- Connectivity tests such as `ping -6` also depend on security group and network ACL rules allowing the relevant outbound traffic and return traffic; the route table alone is not sufficient.
