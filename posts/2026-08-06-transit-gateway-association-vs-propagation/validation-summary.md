# Validation Summary: Transit Gateway Association vs Propagation

## Status

validated

## Post Type

Technical guide and troubleshooting reference

## Technologies Covered

- Amazon Web Services (AWS)
- AWS Transit Gateway
- Amazon Virtual Private Cloud (VPC)
- Transit gateway route-table associations and propagations
- AWS Command Line Interface (AWS CLI) v2
- AWS Network Manager Route Analyzer
- Security groups and network ACLs

## Sources Consulted

- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Transit gateway route tables in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Delete an association for a transit gateway route table](https://docs.aws.amazon.com/vpc/latest/tgw/disassociate-tgw-route-table.html)
- [Create a static route in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-create-static-route.html)
- [AWS CLI v2: `get-transit-gateway-route-table-associations`](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-associations.html)
- [AWS CLI v2: `get-transit-gateway-route-table-propagations`](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-propagations.html)
- [AWS CLI v2: `search-transit-gateway-routes`](https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html)
- [Route Analyzer for AWS Network Manager](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [Amazon VPC security group rules](https://docs.aws.amazon.com/vpc/latest/userguide/security-group-rules.html)

## Issues Found

- The opening failure example ambiguously implied that a route to a VPC's own CIDR should be selected by traffic sourced from that VPC. It now distinguishes the destination VPC route from the source attachment whose association controls the lookup.
- The post said every attachment is associated with exactly one route table. AWS permits disassociation, including the interval required when moving an attachment, so this was changed to no more than one active association at a time and the unassociated interval was documented.
- The overlapping-CIDR caveat only described an identical route. It now matches AWS's documented behavior: a newly attached VPC's routes are not propagated when its CIDR is identical to or overlaps the CIDR of another VPC already attached to the transit gateway.
- The post implied that association and propagation alone could allow only spokes to initiate connections to shared services. Once forward and return routes exist, Transit Gateway routing cannot distinguish replies from newly initiated connections. The text now assigns initiation control to security groups or a stateful firewall while preserving route-table isolation between spokes.
- The example policy inventory called an intentionally absent route an expected blackhole. Because AWS uses `blackhole` for a specific route state, the field was renamed to `expected_no_routes`.

## Review Notes

The AWS CLI command names, required route-table ID options, and `route-search.exact-match` filter syntax are current and valid in AWS CLI v2. The example IDs are intentionally illustrative, and running the commands requires configured AWS credentials, permissions, and a target Region. All external documentation links in the post resolve to the intended AWS documentation pages.
