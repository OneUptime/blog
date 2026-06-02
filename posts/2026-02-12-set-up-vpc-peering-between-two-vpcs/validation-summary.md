# Validation Summary: How to Set Up VPC Peering Between Two VPCs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS VPC
- VPC peering
- AWS CLI
- Amazon EC2 security groups
- VPC route tables
- VPC DNS resolution
- AWS CloudFormation

## Sources Consulted
- Amazon VPC Peering Guide: VPC peering connections - https://docs.aws.amazon.com/vpc/latest/peering/working-with-vpc-peering.html
- Amazon VPC Peering Guide: How VPC peering connections work - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
- Amazon VPC Peering Guide: Update your security groups to reference peer security groups - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html
- Amazon VPC Peering Guide: Enable DNS resolution for a VPC peering connection - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-dns.html
- AWS CLI Command Reference: create-vpc-peering-connection - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-peering-connection.html
- AWS CLI Command Reference: authorize-security-group-ingress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-ingress.html
- AWS CLI Command Reference: modify-vpc-peering-connection-options - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-peering-connection-options.html
- AWS CloudFormation Template Reference: AWS::EC2::VPCPeeringConnection - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcpeeringconnection.html
- AWS CloudFormation Template Reference: AWS::EC2::Route - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-route.html

## Issues Found
- The security group section said peer security groups could be referenced using a VPC ID prefix. AWS documents security group ID references for same-account same-Region peering, account-id/security-group-id notation for console entries across accounts in the same Region, and `--group-owner` for the AWS CLI. The post now describes same-Region security group references accurately and notes that CIDR rules are needed for inter-Region peering.
- The DNS section described the VPC peering DNS option as enabling private DNS name resolution across VPCs, including RDS endpoints. AWS documents this option more narrowly: it makes public EC2 DNS hostnames resolve to private IP addresses across the peering connection. The post now describes that behavior precisely.
- The troubleshooting section said overlapping CIDRs cause silent routing failures. AWS rejects or fails VPC peering requests when VPC CIDR blocks overlap. The post now says overlapping CIDRs cause peering requests to fail.

## Review Notes
The AWS CLI is not installed in the local workspace, so command validation was performed against the current official AWS CLI v2 command reference instead of local `aws help` output.
