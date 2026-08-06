# Validation Summary: Cross-Region Transit Gateway Peering: Static Routes and Costs

## Status
validated

## Post Type
Technical guide and architecture reference

## Technologies Covered

- AWS Transit Gateway
- Transit Gateway intra-Region and inter-Region peering attachments
- Amazon VPC route tables and Transit Gateway route tables
- IPv4 and IPv6 routing
- Amazon Route 53 Resolver
- Security groups and network ACLs
- AWS CloudTrail, VPC Flow Logs, and Transit Gateway Flow Logs
- AWS Transit Gateway pricing and Flexible Cost Allocation

## Sources Consulted

- [Transit gateway peering attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Transit gateway route tables](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html)
- [Create a peering attachment](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering-create.html)
- [Accept or reject a peering attachment request](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering-accept-reject.html)
- [Amazon VPC attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [AWS Transit Gateway quotas](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-quotas.html)
- [Flexible cost allocation](https://docs.aws.amazon.com/vpc/latest/tgw/metering-policy.html)
- [AWS announces Flexible Cost Allocation on AWS Transit Gateway](https://aws.amazon.com/about-aws/whats-new/2025/11/aws-transit-gateway-flexible-cost-allocation/)
- [AWS Transit Gateway pricing](https://aws.amazon.com/transit-gateway/pricing/)
- [Amazon EC2 On-Demand data transfer pricing](https://aws.amazon.com/ec2/pricing/on-demand/#Data_Transfer)
- [Metrics and events in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-monitoring.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [Security group referencing limitations for Transit Gateway VPC attachments](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html#tgw-vpc-attachment-security-groups)

## Issues Found

- The cost discussion described AWS's default sender-pays behavior without accounting for Flexible Cost Allocation, which became available in November 2025. Updated the post to explain that a Transit Gateway metering policy can allocate supported data processing and transfer usage to the source attachment owner, destination attachment owner, or Transit Gateway owner. Also clarified that hourly attachment usage is excluded and that each peered Transit Gateway evaluates its own policy independently.
- The conclusion said that the source side “incurs” the variable charges, which could incorrectly imply that the source attachment owner must always be billed. Changed this to say that the source side generates the directional usage, then directed readers to apply the metering policy to determine the billed account.

## Review Notes

- The routing-path explanation, two-sided static-route requirement, attachment association behavior, route priority, DNS limitation, encryption description, ASN recommendation, and lack of ECMP support all match current AWS documentation.
- The AWS pricing example remains accurate: the documented 1 GB N. Virginia-to-Oregon example generates $0.02 of source-side Transit Gateway data processing and $0.02 of outbound inter-Region transfer, with no destination-side Transit Gateway processing or inbound transfer charge. The post correctly treats those example rates as Region-specific rather than universal.
- The YAML route manifest is syntactically valid and is correctly identified as a proposed governance schema rather than an AWS resource format.
- There are no executable code samples or terminal commands to validate. Security group referencing is not supported across Transit Gateway peering connections, so implementations should use supported CIDR-based rules or other controls where relevant; the post does not claim otherwise.
