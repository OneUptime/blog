# Validation Summary: How to Configure Transit Gateway Route Tables

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Transit Gateway
- AWS Transit Gateway route tables
- Amazon VPC routing
- AWS CLI
- AWS CloudFormation

## Sources Consulted
- AWS Transit Gateway route tables documentation: https://docs.aws.amazon.com/vpc/latest/tgw/tgw-route-tables.html
- AWS CLI `create-transit-gateway` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-transit-gateway.html
- AWS CLI `modify-transit-gateway` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-transit-gateway.html
- AWS CLI `associate-transit-gateway-route-table` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-transit-gateway-route-table.html
- AWS CLI `enable-transit-gateway-route-table-propagation` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/enable-transit-gateway-route-table-propagation.html
- AWS CLI `create-transit-gateway-route` command reference: https://docs.aws.amazon.com/goto/cli2/ec2-2016-11-15/CreateTransitGatewayRoute
- AWS CloudFormation `AWS::EC2::TransitGatewayRouteTablePropagation` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-transitgatewayroutetablepropagation.html
- AWS CloudFormation `AWS::EC2::TransitGatewayRoute` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-transitgatewayroute.html

## Issues Found
- The opening statement implied that the default transit gateway route table alone gives every attachment end-to-end connectivity. I changed it to "full mesh routing" and added that VPC route tables, security groups, and network ACLs must also allow the traffic.
- The CloudFormation example did not fully match the described topology. It created only the production association and two propagations, leaving development and shared services associations and the development/shared propagation path out of the example. I added the missing `AWS::EC2::TransitGatewayRouteTableAssociation` and `AWS::EC2::TransitGatewayRouteTablePropagation` resources.

## Review Notes
The AWS CLI was not installed in the local workspace, so command validation was performed against the current official AWS CLI documentation rather than local `aws --help` output. The linked OneUptime foundational transit gateway post exists in the repository.
