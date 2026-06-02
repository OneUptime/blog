# Validation Summary: How to Set Up a NAT Gateway for Private Subnet Internet Access

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Amazon VPC
- AWS NAT Gateway
- Elastic IP addresses
- AWS CLI
- AWS CloudFormation
- Amazon CloudWatch
- VPC endpoints

## Sources Consulted
- AWS VPC User Guide: NAT gateways, https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- AWS VPC User Guide: NAT gateway use cases, https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-scenarios.html
- AWS CLI Command Reference: create-nat-gateway, https://docs.aws.amazon.com/cli/latest/reference/ec2/create-nat-gateway.html
- AWS CLI Command Reference: allocate-address, https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference: create-route, https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Command Reference: wait nat-gateway-available, https://docs.aws.amazon.com/cli/latest/reference/ec2/wait/nat-gateway-available.html
- AWS CloudFormation Template Reference: AWS::EC2::NatGateway, https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-natgateway.html
- AWS VPC User Guide: NAT gateway metrics and dimensions, https://docs.aws.amazon.com/vpc/latest/userguide/metrics-dimensions-nat-gateway.html
- AWS VPC User Guide: Pricing for NAT gateways, https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- Amazon VPC Pricing, https://aws.amazon.com/vpc/pricing/

## Issues Found
- The NAT translation explanation said the NAT gateway directly replaces the private source IP with its Elastic IP. AWS documents public NAT gateway behavior more precisely: the NAT gateway maps the instance's private IPv4 address to the NAT gateway private IPv4 address, and the internet gateway maps that address to the Elastic IP for internet traffic. Updated the explanation to reflect that flow.
- The high availability section treated a single NAT gateway as universally zonal. Current AWS NAT gateway documentation distinguishes zonal NAT gateways from regional NAT gateways. Updated the HA heading and related wording to specify "zonal NAT gateway" and "zonal NAT gateways" where the article's per-AZ architecture applies.
- The CloudFormation section called the snippet a complete setup, but the snippet references existing VPC and subnet resources rather than defining an entire standalone VPC stack. Changed the wording to "core NAT gateway setup" to avoid implying the template is standalone.

## Review Notes
The AWS CLI commands and CloudFormation resource/property names are valid according to current AWS documentation. The AWS CLI was not installed in the local workspace, so command validation was performed against official AWS CLI documentation rather than local `--help` output.
