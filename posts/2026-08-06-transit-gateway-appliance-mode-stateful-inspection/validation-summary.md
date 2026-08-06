# Validation Summary: Transit Gateway Appliance Mode for Stateful Inspection

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- AWS Transit Gateway
- Transit Gateway VPC attachments and appliance mode
- Transit Gateway route tables, associations, and propagation
- AWS Network Firewall
- Gateway Load Balancer endpoints and stateful third-party appliances
- Availability Zone-aware routing
- Transit Gateway Flow Logs and VPC Flow Logs
- AWS Network Manager Route Analyzer
- AWS CLI
- IPv4 and IPv6 routing

## Sources Consulted

- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [Modify a VPC attachment in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/modify-vpc-attachment.html)
- [AWS CLI: modify-transit-gateway-vpc-attachment](https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-transit-gateway-vpc-attachment.html)
- [AWS CLI: describe-transit-gateway-vpc-attachments](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-transit-gateway-vpc-attachments.html)
- [Transit gateway attachment configuration for AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/vpc-config-tgw-multi-az.html)
- [Avoiding asymmetric routing with AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/asymmetric-routing.html)
- [Contents of an AWS Network Firewall log](https://docs.aws.amazon.com/network-firewall/latest/developerguide/firewall-logging-contents.html)
- [AWS Transit Gateway traffic flow and asymmetric routing](https://docs.aws.amazon.com/prescriptive-guidance/latest/inline-traffic-inspection-third-party-appliances/transit-gateway-asymmetric-routing.html)
- [AWS Transit Gateway Flow Logs](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-flow-logs.html)
- [Route Analyzer for AWS Network Manager](https://docs.aws.amazon.com/network-manager/latest/tgwnm/route-analyzer.html)
- [Considerations for transit gateway-attached firewalls](https://docs.aws.amazon.com/network-firewall/latest/developerguide/tgw-firewall-considerations.html)

## Issues Found
No technical issues found.

The appliance-mode behavior, Availability Zone affinity explanation, route-propagation prerequisite, route-table examples, Network Firewall symmetry requirements, flow-log field names, Route Analyzer limitations, pricing caveat, and AWS CLI commands were all consistent with current AWS documentation. The two AWS CLI examples were also parsed successfully with AWS CLI v2.27.31 using generated output, without making an AWS API call.

## Review Notes
The guide specifically covers an inspection VPC with a VPC attachment and zonal firewall endpoints. AWS also supports transit gateway-attached Network Firewall attachments; for that deployment model, AWS manages the underlying infrastructure, appliance mode is always enabled, and traffic is routed through Transit Gateway route tables rather than inspection-VPC route tables. This newer model does not invalidate the VPC-attached topology described in the post.

Transit Gateway Flow Log metadata fields are best-effort and can be missing or inaccurate for an individual record, so production validation should correlate them with Network Firewall and VPC Flow Logs as the post recommends.
