# Validation Summary: How to Fix 'Subnet Has Insufficient Free Addresses' Errors

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- AWS VPC
- AWS EC2 subnets and elastic network interfaces
- AWS CLI
- AWS Lambda VPC networking
- Amazon EKS VPC CNI
- Amazon CloudWatch
- Amazon VPC IP Address Manager

## Sources Consulted
- AWS VPC subnet sizing documentation: https://docs.aws.amazon.com/vpc/latest/userguide/subnet-sizing.html
- AWS CLI `create-subnet` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/create-subnet.html
- AWS CLI `describe-network-interfaces` command reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-network-interfaces.html
- AWS CLI `put-metric-alarm` command reference: https://docs.aws.amazon.com/cli/latest/reference/cloudwatch/put-metric-alarm.html
- AWS Lambda VPC networking documentation: https://docs.aws.amazon.com/lambda/latest/dg/configuration-vpc.html
- AWS VPC CIDR blocks documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cidr-blocks.html
- AWS VPC CloudWatch metrics documentation: https://docs.aws.amazon.com/vpc/latest/userguide/vpc-cloudwatch.html
- Amazon VPC IPAM resource utilization metrics documentation: https://docs.aws.amazon.com/vpc/latest/ipam/cloudwatch-ipam-res-util.html
- Elastic Load Balancing Application Load Balancer subnet documentation: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- Amazon EC2 instance lifecycle documentation: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-instance-lifecycle.html
- Amazon EKS VPC CNI best practices: https://docs.aws.amazon.com/eks/latest/best-practices/vpc-cni.html
- Amazon EKS VPC CNI prefix mode documentation: https://docs.aws.amazon.com/eks/latest/best-practices/prefix-mode-linux.html

## Issues Found
- The Lambda section implied that VPC Lambda functions can consume many subnet IPs especially under high concurrency. This is outdated for Hyperplane ENIs because Lambda reuses ENIs for the same subnet/security-group combination instead of consuming IPs one-for-one with concurrency. Updated the wording to describe Hyperplane ENI reuse accurately.
- The orphaned ENI cleanup wording could be read as a recommendation to delete any available ENI. Updated it to avoid deleting ENIs managed by another AWS service.
- The CloudWatch alarm example used `AvailableIpAddressCount` under a custom namespace but did not make clear that this value must be published as a custom metric, and it lacked a subnet dimension. Updated the comment and added a `SubnetId` dimension so the alarm targets one subnet-specific custom metric.

## Review Notes
The AWS CLI command shapes, subnet usable-IP calculations, VPC secondary CIDR example, stopped-instance private IP behavior, ALB subnet free-IP guidance, Lambda Hyperplane ENI model, and EKS VPC CNI/prefix delegation claims were checked against current official documentation and are technically valid after the edits above. AWS CLI was not installed in the local environment, so CLI verification was performed against the current AWS CLI command reference instead of local `--help` output.
