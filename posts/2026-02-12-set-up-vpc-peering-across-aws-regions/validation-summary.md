# Validation Summary: How to Set Up VPC Peering Across AWS Regions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon VPC
- Inter-Region VPC peering
- AWS CLI
- AWS CloudFormation
- Security groups
- VPC route tables
- VPC Flow Logs
- Route 53 DNS behavior for VPC peering

## Sources Consulted
- AWS VPC Peering Guide: What is VPC peering? https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html
- AWS VPC Peering Guide: Create a VPC peering connection https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html
- AWS VPC Peering Guide: Enable DNS resolution for a VPC peering connection https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-dns.html
- AWS VPC Peering Guide: Update your security groups to reference peer security groups https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html
- AWS CLI Command Reference: create-vpc-peering-connection https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-peering-connection.html
- AWS CloudFormation Reference: AWS::EC2::VPCPeeringConnection https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/aws-resource-ec2-vpcpeeringconnection.html
- Amazon VPC Pricing: VPC Peering https://aws.amazon.com/vpc/pricing/

## Issues Found
- The DNS explanation incorrectly said private hostnames in one region resolve to private IPs when queried from the peered region. Updated it to match AWS documentation: VPC peering DNS options affect public IPv4 DNS hostnames for EC2 instances, causing them to resolve to private IPv4 addresses across the peering connection.
- The data transfer cost table stated same-region peering is always $0.01/GB in each direction and cross-region peering is $0.02/GB. Updated it to reflect that same-AZ VPC peering traffic is free, same-region cross-AZ traffic is charged in each direction, and cross-region traffic uses region-pair-specific inter-region data transfer rates.
- The CloudFormation example referenced undefined `LocalVPC` and `PrivateRouteTable` resources. Replaced them with explicit `LocalVpcId` and `PrivateRouteTableId` parameters so the snippet is structurally valid.
- The CloudFormation explanation said CloudFormation cannot natively accept cross-region peering. Updated it to clarify that same-account peering is accepted automatically, while cross-account peering needs `PeerOwnerId` and `PeerRoleArn`, manual acceptance, or a custom resource.
- The monitoring section referred to CloudWatch metrics for VPC peering health, but the shown command checks EC2 peering connection status and Flow Logs monitor traffic. Reworded the section to avoid implying native CloudWatch health metrics for VPC peering.

## Review Notes
The AWS CLI commands and VPC peering workflow are otherwise consistent with current AWS documentation. The latency examples are illustrative rather than provider-guaranteed values, so they should be treated as rough planning guidance.
