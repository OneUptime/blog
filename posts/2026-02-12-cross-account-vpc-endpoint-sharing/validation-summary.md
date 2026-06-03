# Validation Summary: How to Configure Cross-Account VPC Endpoint Sharing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS PrivateLink
- Amazon VPC interface endpoints
- AWS Transit Gateway
- AWS Resource Access Manager
- Amazon Route 53 private hosted zones
- AWS CLI
- AWS CloudFormation
- Amazon S3, Amazon ECR, AWS STS, CloudWatch Logs endpoint access

## Sources Consulted
- AWS PrivateLink User Guide: Access AWS services through AWS PrivateLink - https://docs.aws.amazon.com/vpc/latest/privatelink/privatelink-access-aws-services.html
- AWS Whitepaper: Centralized access to VPC private endpoints - https://docs.aws.amazon.com/whitepapers/latest/building-scalable-secure-multi-vpc-network-infrastructure/centralized-access-to-vpc-private-endpoints.html
- AWS Networking Blog: Integrating AWS Transit Gateway with AWS PrivateLink and Amazon Route 53 Resolver - https://aws.amazon.com/blogs/networking-and-content-delivery/integrating-aws-transit-gateway-with-aws-privatelink-and-amazon-route-53-resolver/
- AWS Transit Gateway documentation: Work with AWS Transit Gateway - https://docs.aws.amazon.com/vpc/latest/tgw/working-with-transit-gateways.html
- AWS Transit Gateway documentation: Amazon VPC attachments - https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- AWS RAM User Guide: Creating a resource share - https://docs.aws.amazon.com/ram/latest/userguide/working-with-sharing-create.html
- Amazon Route 53 Developer Guide: Associating a private hosted zone with a VPC in a different account - https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/hosted-zone-private-associate-vpcs-different-accounts.html
- AWS CLI Command Reference: create-vpc-endpoint - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI Command Reference: modify-vpc-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-attribute.html
- AWS CLI Command Reference: change-resource-record-sets - https://docs.aws.amazon.com/cli/latest/reference/route53/change-resource-record-sets.html
- AWS CloudFormation Template Reference: AWS::EC2::VPCEndpoint - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-vpcendpoint.html

## Issues Found
- The DNS section incorrectly used a Route 53 Resolver outbound endpoint and forwarding rules that targeted VPC endpoint ENI IPs on port 53. Interface endpoint ENIs are HTTPS service endpoints, not DNS resolvers. Replaced this with the AWS-documented VPC-to-VPC pattern: disable endpoint private DNS, create Route 53 private hosted zones with alias records pointing to the endpoint regional DNS names, and associate those zones with spoke VPCs.
- The endpoint creation examples were inconsistent with the custom private hosted zone pattern. Changed the centralized interface endpoint examples to use `--no-private-dns-enabled`.
- The spoke routing example only added a route from the spoke VPC to the shared services VPC. Added the corresponding return route from the shared services VPC route table to the spoke CIDR through the transit gateway.
- The VPC DNS attribute command enabled only DNS hostnames and omitted the structured boolean value used by the AWS CLI examples. Added DNS support and DNS hostname commands with explicit `{"Value":true}` values.
- The CloudFormation snippet referenced `SubnetAZ1` and `SubnetAZ2` without defining them. Added minimal subnet resources so the template fragment is internally valid.
- The CloudFormation endpoints had `PrivateDnsEnabled: true`, which conflicted with the corrected custom private hosted zone approach. Changed these to `false`.

## Review Notes
AWS notes that Route 53 Profiles can now simplify multi-VPC DNS management for PrivateLink, and the older Transit Gateway plus custom DNS design is no longer the preferred design for every new deployment. The corrected post remains technically valid as a working architecture, but a future update could mention Route 53 Profiles as the newer operational option.
