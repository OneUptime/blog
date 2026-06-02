# Validation Summary: How to Set Up VPC Peering Across AWS Accounts

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon VPC
- VPC peering
- Cross-account AWS networking
- AWS CLI
- Amazon EC2 security groups
- VPC route tables
- VPC Flow Logs
- AWS CloudFormation
- AWS Organizations
- AWS STS

## Sources Consulted
- Amazon VPC: Create a VPC peering connection - https://docs.aws.amazon.com/vpc/latest/peering/create-vpc-peering-connection.html
- Amazon VPC: Accept or reject a VPC peering connection - https://docs.aws.amazon.com/vpc/latest/peering/accept-vpc-peering-connection.html
- Amazon VPC: How VPC peering connections work - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-basics.html
- Amazon VPC: Update your security groups to reference peer security groups - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-security-groups.html
- Amazon VPC: Enable DNS resolution for a VPC peering connection - https://docs.aws.amazon.com/vpc/latest/peering/vpc-peering-dns.html
- Amazon VPC: VPC peering limitations - https://docs.aws.amazon.com/vpc/latest/peering/invalid-peering-configurations.html
- AWS CLI: create-vpc-peering-connection - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-peering-connection.html
- AWS CLI: create-route - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI: modify-vpc-peering-connection-options - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-peering-connection-options.html
- AWS CLI: create-flow-logs - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-flow-logs.html
- AWS CLI: assume-role - https://docs.aws.amazon.com/cli/latest/reference/sts/assume-role.html
- AWS CloudFormation: AWS::EC2::VPCPeeringConnection - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcpeeringconnection.html
- AWS CloudFormation: Peer with a VPC in another AWS account - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/peer-with-vpc-in-another-account.html
- AWS Resource Access Manager: What is AWS RAM? - https://docs.aws.amazon.com/ram/latest/userguide/what-is.html

## Issues Found
- The post said `--peer-region` is needed even when both VPCs are in the same region. AWS CLI documentation says it is required only when the peer VPC is in a different region, and otherwise defaults to the request region. Updated the explanation.
- The DNS section described the option as resolving private DNS names across peering. AWS documents this setting as making public EC2 DNS hostnames resolve to private IPv4 addresses over the peering connection, with both VPCs requiring DNS hostnames and DNS resolution enabled. Updated the wording and prerequisites.
- The CloudFormation section said CloudFormation does not natively support accepting cross-account peering and omitted `PeerRoleArn`. AWS CloudFormation supports cross-account VPC peering with a peer role, and `PeerRoleArn` is required for different-account peering. Updated the text and template.
- The AWS Organizations section implied AWS RAM resource sharing simplifies VPC peering. AWS RAM shares supported resource types, but VPC peering still follows the same request/accept workflow. Removed the unsupported resource-sharing implication.
- The VPC Flow Logs CloudWatch Logs example omitted `--deliver-logs-permission-arn`, which AWS CLI documentation requires for CloudWatch Logs destinations. Added an example delivery role ARN.

## Review Notes
The remaining AWS CLI commands and examples use current AWS CLI parameters and match the documented VPC peering workflow: request, accept, add routes on both sides, adjust security groups, and optionally enable DNS resolution after the peering connection is active. The AWS CLI was not installed in the local environment, so command verification was performed against official AWS CLI and AWS service documentation.
