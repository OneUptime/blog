# Validation Summary: Build Transit Gateway Routing Domains Without Route Leaks

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- AWS Transit Gateway
- Transit Gateway route tables, associations, propagations, static routes, and blackhole routes
- Amazon VPC route tables, VPC attachments, security groups, and network ACLs
- AWS Network Manager Route Analyzer
- VPC Flow Logs and Transit Gateway Flow Logs
- AWS CLI v2
- Managed prefix lists and centralized network inspection

## Sources Consulted

- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Transit gateways in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-transit-gateways.html)
- [Transit gateway route tables](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [AWS Transit Gateway quotas](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html)
- [Create a route table prefix list reference](https://docs.aws.amazon.com/vpc/latest/tgw/create-prefix-list-reference.html)
- [Create a static route in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-create-static-route.html)
- [Using and customizing route tables in Network Orchestration for AWS Transit Gateway](https://docs.aws.amazon.com/solutions/latest/network-orchestration-aws-transit-gateway/using-and-customizing-route-tables.html)
- [AWS Network Manager Route Analyzer](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [Amazon VPC route table concepts](https://docs.aws.amazon.com/vpc/latest/userguide/RouteTables.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [AWS CLI v2: describe-transit-gateway-attachments](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-transit-gateway-attachments.html)
- [AWS CLI v2: get-transit-gateway-route-table-associations](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-associations.html)
- [AWS CLI v2: get-transit-gateway-route-table-propagations](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-propagations.html)
- [AWS CLI v2: search-transit-gateway-routes](https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html)
- [AWS CLI v2: create-transit-gateway](https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway.html)
- [AWS CLI v2: modify-transit-gateway](https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-transit-gateway.html)

## Issues Found

- The ingress-policy explanation said every attachment has one association. An attachment can be associated with at most one transit gateway route table and can be temporarily unassociated. The wording now states the one-table limit without implying that an association always exists.
- The default-route-table explanation implied that default association and default propagation necessarily use one common table. AWS exposes separate default table IDs, so the text now distinguishes the two and limits the full-mesh statement to the case where both defaults point to the same table.
- The audit invariants required expected blackholes to be active and then rejected all routes in the `blackhole` state. AWS represents an intentional blackhole route with state `blackhole`, not `active`. The invariants now require approved deny routes to be `blackhole` and permitted routes to be `active`.
- The domain-change sequence left old propagation enabled until after negative tests. When an attachment moves between domains, an old propagation can leave a route from the former domain to the moved attachment, creating the route leak the test is intended to reject. The sequence now withdraws boundary-violating propagation before moving the association and removes only non-violating obsolete propagation afterward.

## Review Notes

All three AWS CLI commands use current operation names, required parameters, and valid filter syntax. They were checked against the current AWS CLI v2 reference and parsed successfully with the locally installed AWS CLI 2.27.31. The post does not pin service or CLI versions, and no deprecated API usage was found. All six links in the post's Official Documentation section resolve to the intended AWS documentation.
