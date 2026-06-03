# Validation Summary: How to Choose Between NAT Gateway and NAT Instance

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Amazon VPC
- AWS NAT Gateway
- AWS NAT instances on EC2
- AWS CLI
- CloudFormation
- Linux IP forwarding and iptables

## Sources Consulted
- AWS VPC User Guide: NAT gateway basics - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-basics.html
- AWS VPC User Guide: Compare NAT gateways and NAT instances - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-comparison.html
- AWS VPC User Guide: NAT instances - https://docs.aws.amazon.com/vpc/latest/userguide/VPC_NAT_Instance.html
- AWS VPC User Guide: Enable private resources to communicate outside the VPC - https://docs.aws.amazon.com/vpc/latest/userguide/work-with-nat-instances.html
- AWS VPC User Guide: Regional NAT gateways for automatic multi-AZ expansion - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateways-regional.html
- AWS CLI Command Reference: create-nat-gateway - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-nat-gateway.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: create-route - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-route.html
- AWS CLI Command Reference: modify-instance-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-instance-attribute.html
- AWS CloudFormation Template Reference: AWS::AutoScaling::AutoScalingGroup - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-resource-autoscaling-autoscalinggroup.html
- AWS CloudFormation Template Reference: LaunchTemplateSpecification - https://docs.aws.amazon.com/AWSCloudFormation/latest/TemplateReference/aws-properties-autoscaling-autoscalinggroup-launchtemplatespecification.html
- Amazon VPC Pricing - https://aws.amazon.com/vpc/pricing/
- Amazon EC2 User Guide: Elastic IP addresses - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- OneUptime blog cross-link - https://oneuptime.com/blog/post/2026-02-12-create-vpc-from-scratch-in-aws/view

## Issues Found
- Updated NAT gateway availability wording to account for both zonal NAT gateways and current Regional NAT Gateway mode. The original text only described redundancy within a single Availability Zone.
- Updated NAT gateway pricing wording and examples to note region-dependent pricing, standard data transfer charges, and current public IPv4 charges. The original examples omitted the public IPv4 hourly charge for both NAT gateways and NAT instances.
- Replaced the claim that high data transfer can make the NAT gateway premium negligible. NAT gateway data processing charges scale with usage, so the stronger technical recommendation is based on operational cost and reliability trade-offs.
- Updated NAT instance operating system wording to refer to current Amazon Linux options, because AWS notes that the older NAT AMI based on Amazon Linux AMI 2018.03 is past support.
- Updated the NAT instance iptables setup to install and enable `iptables-services`, apply IP forwarding via `/etc/sysctl.d/`, and persist rules with `service iptables save`, matching AWS's current Amazon Linux guidance more closely.
- Corrected the staging recommendation from "NAT gateway with a single instance" to "single zonal NAT gateway" or Regional NAT Gateway where available.

## Review Notes
The AWS CLI examples and CloudFormation snippet use valid current parameters. Cost examples remain approximate and region-dependent; future revisions should consider replacing static dollar figures with a short pricing formula or linking readers to the AWS Pricing Calculator.
