# Validation Summary: Why VPC Route Tables Do Not Learn Transit Gateway Routes

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Amazon Web Services (AWS)
- Amazon Virtual Private Cloud (VPC)
- AWS Transit Gateway
- VPC and Transit Gateway route tables
- AWS CLI for Amazon EC2
- AWS CloudFormation
- AWS Network Manager Route Analyzer
- VPC Reachability Analyzer
- IPv4 and IPv6 routing

## Sources Consulted

- [Amazon VPC routing for a transit gateway](https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html#route-tables-tgw)
- [Amazon VPC route table concepts](https://docs.aws.amazon.com/vpc/latest/userguide/RouteTables.html)
- [AWS Transit Gateway VPC attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Transit gateway route tables](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [AWS CLI `create-route`](https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html)
- [AWS CLI `replace-route`](https://docs.aws.amazon.com/cli/latest/reference/ec2/replace-route.html)
- [AWS CLI `describe-route-tables`](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html)
- [CloudFormation `AWS::EC2::Route`](https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-route.html)
- [AWS Network Manager Route Analyzer](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [How VPC Reachability Analyzer works](https://docs.aws.amazon.com/vpc/latest/reachability/how-reachability-analyzer-works.html)

## Issues Found

- The packet-path checklist said that a Transit Gateway attachment must "exist" in the source Availability Zone. A VPC has one attachment that selects attachment subnets in enabled Availability Zones. Clarified that the attachment must include an attachment subnet in the source Availability Zone, including in the final validation checklist.
- The VPC local route was described as immutable. AWS supports adding routes more specific than the local route and, for supported middlebox targets, replacing the local route's target. Changed "immutable local route" to "default local route" and clarified both supported override patterns.
- The IPv6 CLI example did not mention that IPv6 support on a Transit Gateway VPC attachment is disabled by default. Added the requirement to enable attachment IPv6 support before using the IPv6 route for traffic.

## Review Notes

- The AWS CLI commands and options are current and syntactically correct. The example identifiers and documentation IPv6 prefix are placeholders and must be replaced with values applicable to the deployment.
- The CloudFormation resource properties and explicit dependency on the Transit Gateway attachment match the current `AWS::EC2::Route` documentation.
- The Availability Zone and attachment-subnet route-table requirements match current AWS documentation.
- VPC Reachability Analyzer is a static configuration analyzer, not a data-plane test. Its current limitations include IPv4-only resource analysis, no Transit Gateway Connect attachment traversal, and forward-only analysis for TCP paths traversing a Transit Gateway route table.
