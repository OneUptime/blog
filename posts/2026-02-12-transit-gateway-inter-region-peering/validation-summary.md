# Validation Summary: How to Configure Transit Gateway Inter-Region Peering

## Status
validated

## Post Type
Tutorial / Implementation guide

## Technologies Covered
- AWS Transit Gateway
- Transit Gateway inter-Region peering
- Amazon VPC route tables and Transit Gateway route tables
- AWS CLI for EC2 and CloudWatch
- AWS CDK v2 for TypeScript
- Amazon CloudWatch Transit Gateway metrics

## Sources Consulted
- AWS Transit Gateway peering attachments: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-peering.html
- How AWS Transit Gateway works, including route tables and peering routes: https://docs.aws.amazon.com/vpc/latest/tgw/how-transit-gateways-work.html
- Create a transit gateway in AWS Transit Gateway: https://docs.aws.amazon.com/vpc/latest/tgw/create-tgw.html
- AWS CLI v2 create-transit-gateway-peering-attachment: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway-peering-attachment.html
- AWS CLI v2 accept-transit-gateway-peering-attachment: https://docs.aws.amazon.com/cli/latest/reference/ec2/accept-transit-gateway-peering-attachment.html
- AWS CLI v2 create-transit-gateway: https://awscli.amazonaws.com/v2/documentation/api/latest/reference/ec2/create-transit-gateway.html
- AWS CLI v2 create-route: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS Transit Gateway CloudWatch metrics: https://docs.aws.amazon.com/vpc/latest/tgw/transit-gateway-cloudwatch-metrics.html
- AWS Transit Gateway pricing: https://aws.amazon.com/transit-gateway/pricing/
- AWS CDK v2 CfnTransitGatewayVpcAttachment: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.CfnTransitGatewayVpcAttachment.html
- AWS CDK v2 CfnTransitGatewayPeeringAttachment: https://docs.aws.amazon.com/cdk/api/v2/docs/aws-cdk-lib.aws_ec2.CfnTransitGatewayPeeringAttachment.html

## Issues Found
- The post stated that each transit gateway needs a unique ASN. AWS documentation recommends unique ASNs for multi-region and peered transit gateways, but does not state this as a requirement for Transit Gateway peering. Changed the wording from "needs" to "AWS recommends" while preserving the guidance to use different ASN values.
- The CloudWatch alarm CDK snippet referenced `transitGateway.ref`, but the earlier stack code exposes the transit gateway as `this.transitGateway`. Updated the dimension reference to `this.transitGateway.ref` so the snippet is consistent with the surrounding TypeScript class context.

## Review Notes
The CLI commands and routing model align with AWS documentation: peering attachments must be accepted by the peer side, peering routes are static routes in Transit Gateway route tables, and VPC route tables need routes pointing at the local Transit Gateway. The CDK section is a starting point for Transit Gateway and VPC attachment creation; a complete CDK-only deployment would also need explicit peering acceptance and route resources or an equivalent operational step.
