# Validation Summary: Isolate Production and Shared Services with Transit Gateway

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- AWS Transit Gateway
- Amazon VPC and VPC route tables
- Transit Gateway route-table associations, propagations, static routes, and blackhole routes
- Transit Gateway VPC attachments and Availability Zone behavior
- Security groups, network ACLs, and AWS PrivateLink
- Centralized inspection and AWS Network Firewall
- VPC Reachability Analyzer and AWS Network Manager Route Analyzer
- AWS CLI

## Sources Consulted

- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS Transit Gateway route tables](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Create a transit gateway](https://docs.aws.amazon.com/vpc/latest/tgw/create-tgw.html)
- [Create a static Transit Gateway route](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-create-static-route.html)
- [Amazon VPC route table concepts](https://docs.aws.amazon.com/vpc/latest/userguide/RouteTables.html)
- [Availability Zone IDs for AWS resources](https://docs.aws.amazon.com/ram/latest/userguide/working-with-az-ids.html)
- [How VPC Reachability Analyzer works](https://docs.aws.amazon.com/vpc/latest/reachability/how-reachability-analyzer-works.html)
- [AWS Network Manager Route Analyzer](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [Avoiding asymmetric routing with AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/asymmetric-routing.html)
- [AWS CLI: get-transit-gateway-route-table-associations](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-associations.html)
- [AWS CLI: get-transit-gateway-route-table-propagations](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-propagations.html)
- [AWS CLI: search-transit-gateway-routes](https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html)
- [AWS CLI: describe-transit-gateway-vpc-attachments](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-transit-gateway-vpc-attachments.html)

## Issues Found

- The tooling guidance did not state that VPC Reachability Analyzer currently supports only resources with IPv4 addresses. Changed “supported VPC path analysis” to “supported IPv4 VPC path analysis” so the recommendation does not imply that the preceding IPv6 test cases can be analyzed with this tool.
- The route inventory command searched only the IPv4 route space, so it could miss broad or default IPv6 routes in a dual-stack deployment. Added `::/0` to the `route-search.subnet-of-match` filter values.
- The listed route-table commands do not report the subnets enabled on a Transit Gateway VPC attachment and therefore cannot detect the stated Availability Zone drift condition. Added `describe-transit-gateway-vpc-attachments`, filtered by transit gateway ID, and clarified that it runs once per transit gateway rather than once per route table.

## Review Notes

The route-table segmentation design, longest-prefix and blackhole behavior, VPC attachment Availability Zone requirements, security-control caveats, appliance-mode guidance, Route Analyzer limitations, CIDR summary, documentation links, and AWS CLI command names and flags were otherwise verified as correct. AWS now also supports directly attached Network Firewall network functions; the post's inspection-VPC discussion remains valid because it is explicitly conditional on using a firewall VPC.
