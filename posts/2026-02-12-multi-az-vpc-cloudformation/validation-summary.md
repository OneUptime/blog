# Validation Summary: How to Create a Multi-AZ VPC with CloudFormation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudFormation
- Amazon VPC
- Public and private subnets
- Internet gateways
- NAT gateways
- Route tables and routes
- VPC Flow Logs
- AWS IAM
- AWS CLI
- Kubernetes AWS load balancer subnet tags

## Sources Consulted
- AWS CloudFormation `AWS::EC2::NatGateway` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-natgateway.html
- AWS CloudFormation `AWS::EC2::Route` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-route.html
- AWS CloudFormation `AWS::EC2::FlowLog` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-flowlog.html
- AWS CloudFormation `Fn::GetAZs` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-getavailabilityzones.html
- AWS CloudFormation `Fn::Split` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-split.html
- AWS CloudFormation `Fn::ImportValue` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/intrinsic-function-reference-importvalue.html
- AWS VPC NAT gateway basics: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- AWS VPC NAT gateway pricing: https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- AWS VPC Flow Logs IAM role permissions: https://docs.aws.amazon.com/vpc/latest/userguide/flow-logs-iam-role.html
- AWS CLI `cloudformation create-stack` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack.html

## Issues Found
- The `SingleNatGateway=true` option created only `NatGateway1` but did not create default routes for private subnets 2 and 3. I changed `DefaultPrivateRoute2` and `DefaultPrivateRoute3` to use the `CreateNatGateways` condition and select either their AZ-local NAT gateway or `NatGateway1` with `Fn::If`.
- The VPC Flow Logs IAM role was missing `logs:CreateLogGroup`, which AWS lists in the minimum permissions for publishing flow logs to CloudWatch Logs. I added that action to the inline policy.
- The NAT gateway cost section presented hourly NAT gateway costs without noting regional pricing variance or data processing and data transfer charges. I qualified the estimate as applying to regions priced at `$0.045/hour` and clarified that it excludes those additional charges.

## Review Notes
The CloudFormation resource types, intrinsic functions, subnet route table associations, exported outputs, and AWS CLI commands were otherwise consistent with official AWS documentation. `cfn-lint` and the AWS CLI were not installed in the local environment, so validation was performed by documentation review rather than a local CloudFormation validation command.
