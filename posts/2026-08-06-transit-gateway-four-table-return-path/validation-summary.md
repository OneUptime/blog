# Validation Summary: Transit Gateway Return Path: A Four-Table Checklist

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered

- Amazon Web Services (AWS)
- AWS Transit Gateway
- Amazon Virtual Private Cloud (VPC)
- VPC and Transit Gateway route tables
- AWS CLI for Amazon EC2
- VPC Flow Logs and Transit Gateway Flow Logs
- AWS Network Manager Route Analyzer
- VPC Reachability Analyzer
- Security groups and network ACLs
- Stateful network appliances and Transit Gateway appliance mode

## Sources Consulted

- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Transit gateway route tables in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [Amazon VPC route table concepts](https://docs.aws.amazon.com/vpc/latest/userguide/RouteTables.html)
- [How VPC route priority works](https://docs.aws.amazon.com/vpc/latest/userguide/route-tables-priority.html)
- [AWS CLI: `describe-route-tables`](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html)
- [AWS CLI: `get-transit-gateway-route-table-associations`](https://docs.aws.amazon.com/cli/latest/reference/ec2/get-transit-gateway-route-table-associations.html)
- [AWS CLI: `search-transit-gateway-routes`](https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html)
- [AWS Network Manager Route Analyzer](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [VPC Flow Log records](https://docs.aws.amazon.com/vpc/latest/userguide/flow-log-records.html)
- [How VPC Reachability Analyzer works](https://docs.aws.amazon.com/vpc/latest/reachability/how-reachability-analyzer-works.html)
- [Amazon VPC security groups](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-security-groups.html)
- [Amazon VPC network ACLs](https://docs.aws.amazon.com/vpc/latest/userguide/vpc-network-acls.html)

## Issues Found

- The opening and conclusion described only four route decisions even though delivery from Transit Gateway into each VPC always uses the route table associated with an attachment subnet. Clarified that the four named tables are the primary remote-CIDR checks and that attachment-subnet lookups must also be traced; they may reuse a workload route table or add a distinct table.
- The source-side delivery text said traffic may use the attachment-subnet route table. Corrected it to say that delivery uses that table and identified when it needs separate inspection.
- The Flow Logs table blurred the semantics of VPC and Transit Gateway Flow Logs. Labeled the VPC `REJECT` case, included AWS's documented closed-connection case, and replaced the generic Transit Gateway “reason” wording with the actual `packets-lost-no-route` and `packets-lost-blackhole` fields.
- The Reachability Analyzer paragraph omitted the documented limitation that TCP paths traversing a Transit Gateway route table are analyzed only in the forward direction. Added that limitation.
- The incident checklist referred ambiguously to “both source Availability Zones.” Changed it to require that each workload's Availability Zone be enabled on its own VPC attachment.
- The post advised recording route IDs, but VPC and Transit Gateway route entries do not expose individual route IDs. Changed the advice to record route-table IDs, destination prefixes, targets, and timestamped API output.

## Review Notes

- All three AWS CLI examples use current command names, required options, valid filter names, and valid shorthand syntax. Their argument parsing was also checked with AWS CLI v2.
- The placeholder resource IDs must be replaced with real IDs, and the caller must supply AWS credentials and a Region through normal AWS CLI configuration.
- Route Analyzer requires the transit gateways to be registered in an AWS Network Manager global network, and it reports a return path only when forward-path analysis succeeds.
