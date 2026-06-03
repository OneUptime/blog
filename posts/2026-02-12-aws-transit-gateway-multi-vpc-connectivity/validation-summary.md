# Validation Summary: How to Use AWS Transit Gateway for Multi-VPC Connectivity

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- AWS Transit Gateway
- Amazon VPC
- VPC peering
- AWS CLI
- AWS CloudFormation
- AWS Direct Connect and Site-to-Site VPN attachment concepts

## Sources Consulted
- AWS CLI Command Reference: create-transit-gateway - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway.html
- AWS CLI Command Reference: create-route - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Command Reference: search-transit-gateway-routes - https://docs.aws.amazon.com/cli/latest/reference/ec2/search-transit-gateway-routes.html
- Amazon VPC Transit Gateway Guide: What is AWS Transit Gateway - https://docs.aws.amazon.com/vpc/latest/tgw/what-is-transit-gateway.html
- Amazon VPC Transit Gateway Guide: How AWS Transit Gateway works - https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- Amazon VPC Transit Gateway Guide: VPC attachments - https://docs.aws.amazon.com/vpc/latest/tgw/tgw-vpc-attachments.html
- Amazon VPC Transit Gateway Guide: Create a VPC attachment - https://docs.aws.amazon.com/vpc/latest/tgw/create-vpc-attachment.html
- Amazon VPC Transit Gateway Guide: Route tables - https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html
- Amazon VPC Transit Gateway Guide: Design best practices - https://docs.aws.amazon.com/vpc/latest/tgw/tgw-best-design-practices.html
- AWS CloudFormation Template Reference: AWS::EC2::TransitGateway - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-transitgateway.html
- AWS CloudFormation Template Reference: AWS::EC2::TransitGatewayVpcAttachment - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-transitgatewayvpcattachment.html
- AWS Transit Gateway pricing - https://aws.amazon.com/transit-gateway/pricing/
- Amazon VPC peering documentation - https://docs.aws.amazon.com/vpc/latest/peering/what-is-vpc-peering.html

## Issues Found
- The post said three VPCs require six VPC peering connections, but a full mesh of three VPCs requires three peering connections. Updated the count.
- The `DnsSupport` explanation was too broad. Updated it to describe AWS Transit Gateway's DNS behavior as public DNS hostname resolution to private IP addresses across attached VPCs.
- The VPC attachment subnet explanation implied every attachment needs one subnet in every AZ. Updated it to say an attachment needs at least one subnet, only one subnet can be selected per AZ, and one subnet should be selected in each workload AZ that needs TGW access.
- The CloudFormation example referenced parameters that were not declared. Added the required VPC, subnet, and route table parameters.
- The CloudFormation example attached the shared services VPC but did not include a route from production to the shared services CIDR or a return route from shared services to production. Updated the route destinations and added the return route.
- The pricing section stated VPC peering always charges `$0.01/GB` for data. Updated it to note that same-AZ VPC peering data transfer is free and cross-AZ or cross-Region traffic is charged.

## Review Notes
AWS pricing varies by Region and can change over time. The post now frames the Transit Gateway rates as common regional pricing rather than universal pricing.
