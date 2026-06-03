# Validation Summary: How to Automate EC2 Provisioning with CloudFormation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- AWS CloudFormation
- Amazon EC2
- Amazon VPC networking
- EC2 security groups
- AWS Systems Manager Parameter Store public AMI parameters
- CloudFormation helper scripts: cfn-init and cfn-signal
- AWS CLI

## Sources Consulted
- AWS CloudFormation Template Reference: AWS::EC2::Instance - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-instance.html
- AWS CloudFormation User Guide: CloudFormation-supplied parameter types - https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/cloudformation-supplied-parameter-types.html
- AWS CloudFormation Template Reference: AWS::CloudFormation::Init - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-init.html
- AWS CloudFormation Template Reference: cfn-init - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/cfn-init.html
- AWS CloudFormation Template Reference: cfn-signal - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/cfn-signal.html
- AWS CloudFormation Template Reference: CreationPolicy attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-creationpolicy.html
- AWS CloudFormation Template Reference: AWS::EC2::SecurityGroup - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-ec2-securitygroup.html
- AWS CloudFormation Template Reference: DeletionPolicy attribute - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-attribute-deletionpolicy.html
- AWS CLI Command Reference: create-stack - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-stack.html
- AWS CLI Command Reference: update-stack - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/update-stack.html
- AWS CLI Command Reference: create-change-set - https://docs.aws.amazon.com/cli/latest/reference/cloudformation/create-change-set.html

## Issues Found
- The minimal EC2 template used a non-working placeholder AMI ID. I replaced it with an official public SSM dynamic reference for the latest Amazon Linux 2023 AMI so the snippet can resolve a valid regional AMI at deployment time.
- The networking section described "public and private subnets," but the snippet only creates a public subnet. I corrected the text to say it creates a public subnet.
- The cfn-init services example used `sysvinit` while the template uses Amazon Linux 2023. AWS documents that Amazon Linux 2 and later support the services key through `systemd`, so I changed the service manager key to `systemd`.
- The EC2 instance launches in a VPC created in the same template and receives a public IP. AWS documents that such instances should depend on the VPC internet gateway attachment, so I added `DependsOn: AttachGateway`.
- The update-stack and create-change-set examples changed only `InstanceType`, while the template also has parameters that should retain their existing stack values. I added `UsePreviousValue=true` entries for `KeyName`, `Environment`, and `LatestAmiId`.

## Review Notes
The AWS CLI was not installed in the local environment, so CLI syntax was checked against the official AWS CLI command reference instead of local `aws --help` output. The post's internal OneUptime links returned HTTP 200 during validation.
