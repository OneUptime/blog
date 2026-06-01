# Validation Summary: How to Use AWS CloudFormation with the AWS CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudFormation
- AWS CLI
- CloudFormation YAML templates
- Amazon S3
- Amazon VPC
- IAM capabilities for CloudFormation stacks
- JMESPath queries in AWS CLI commands

## Sources Consulted
- AWS CLI `create-stack` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack.html
- AWS CLI `create-change-set` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html
- AWS CloudFormation change sets guide: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-updating-stacks-changesets.html
- AWS CloudFormation `ResourceChange` API reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/APIReference/API_ResourceChange.html
- AWS CloudFormation `Fn::Cidr` intrinsic function reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/intrinsic-function-reference-cidr.html
- AWS CloudFormation `AWS::EC2::Subnet` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-subnet.html
- AWS CloudFormation `AWS::S3::Bucket` reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-s3-bucket.html
- AWS CloudFormation S3 bucket versioning reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-s3-bucket-versioningconfiguration.html
- AWS CloudFormation outputs syntax: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/outputs-section-structure.html
- AWS CloudFormation `DependsOn` attribute reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-dependson.html
- Amazon VPC internet gateway guide: https://docs.aws.amazon.com/vpc/latest/userguide/VPC_Internet_Gateway.html
- Amazon VPC route table examples: https://docs.aws.amazon.com/vpc/latest/userguide/route-table-options.html
- AWS CloudFormation VPC quick reference: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/quickref-ec2-vpc.html

## Issues Found
- The VPC example described a public subnet, but the template did not create or attach an internet gateway, create a public route table, add a `0.0.0.0/0` route to the internet gateway, or associate that route table with the public subnet. Added `AWS::EC2::InternetGateway`, `AWS::EC2::VPCGatewayAttachment`, `AWS::EC2::RouteTable`, `AWS::EC2::Route`, and `AWS::EC2::SubnetRouteTableAssociation` resources so the public subnet is actually public per Amazon VPC routing documentation.
- The VPC template included an `EnableNatGateway` parameter and `CreateNatGateway` condition, and the example passed `EnableNatGateway=true`, but the template did not define any NAT gateway resources. Removed the unused parameter, condition, and parameter examples so the snippet no longer claims to create a NAT gateway.
- The first stack creation command specified `--region us-east-1`, but the subsequent `wait` and `describe-stacks` commands did not specify the same region. Added `--region us-east-1` to those commands so the sequence consistently targets the created stack.

## Review Notes
The remaining CLI commands and CloudFormation snippets are consistent with current AWS CLI and CloudFormation documentation. The `validate-template` command checks template syntax and basic structure, but deeper service-level validation can still fail during stack creation or change-set creation.
