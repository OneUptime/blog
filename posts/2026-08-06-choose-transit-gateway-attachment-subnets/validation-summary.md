# Validation Summary: Choose Transit Gateway Attachment Subnets by Availability Zone

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- AWS Transit Gateway and VPC attachments
- Amazon VPC subnets, route tables, network ACLs, and IPv4/IPv6 addressing
- AWS Availability Zones, Availability Zone IDs, and Local Zones
- AWS NAT Gateway and internet gateways
- AWS Network Firewall and appliance-mode routing
- Amazon CloudWatch Transit Gateway metrics
- AWS Command Line Interface (AWS CLI)

## Sources Consulted

- [Amazon VPC attachments in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html)
- [Create a VPC attachment in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/create-vpc-attachment.html)
- [How AWS Transit Gateway works](https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html)
- [AWS Transit Gateway design best practices](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-best-design-practices.html)
- [Network ACLs for transit gateways](https://docs.aws.amazon.com/vpc/latest/tgw/tgw-nacls.html)
- [Subnet route tables](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-route-tables.html)
- [Subnet CIDR blocks](https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html)
- [Subnets in AWS Local Zones](https://docs.aws.amazon.com/vpc/latest/userguide/local-zone.html)
- [Availability Zone IDs for AWS resources](https://docs.aws.amazon.com/ram/latest/userguide/working-with-az-ids.html)
- [Troubleshooting general issues in AWS Network Firewall](https://docs.aws.amazon.com/network-firewall/latest/developerguide/troubleshooting-general-issues.html)
- [CloudWatch metrics in AWS Transit Gateway](https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-cloudwatch-metrics.html)
- [AWS CLI `create-transit-gateway-vpc-attachment` command reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway-vpc-attachment.html)
- [AWS CLI `describe-transit-gateway-vpc-attachments` command reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-transit-gateway-vpc-attachments.html)
- [AWS CLI `describe-route-tables` command reference](https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-route-tables.html)
- Local AWS CLI 2.27.31 command help for all three commands used in the post

## Issues Found

- The post said that AWS reserves addresses in every VPC subnet. AWS normally reserves the first four and last IPv4 addresses, but BYOIP address space is an exception. The text now states that exception.
- The attachment command used illustrative subnet names that were not valid AWS subnet ID shapes. They were replaced with syntactically valid placeholder subnet IDs so the command is structurally executable.
- The route-table inspection command filtered only on `association.subnet-id`. AWS does not return subnet IDs for implicit associations, so that filter can miss a subnet using the VPC's main route table. The post now explains this and includes a fallback query for the main route table.

## Review Notes

The core same-Availability-Zone attachment requirement, selected-subnet data path, dedicated-subnet recommendation, centralized NAT example, IPv6 and Local Zone restrictions, overlapping-CIDR behavior, Network Firewall symmetry guidance, Availability Zone ID guidance, attachment options, and per-Availability-Zone CloudWatch metrics all match current AWS documentation. AWS also offers service-managed Network Firewall network function attachments; the post's manually routed inspection-VPC pattern remains valid for Transit Gateway VPC attachments.
