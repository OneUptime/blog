# Validation Summary: How to Set Up EC2 Instances in a Private Subnet with NAT

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon EC2
- Amazon VPC
- Public and private subnets
- NAT Gateway
- Internet Gateway
- Route tables
- Security groups
- AWS CLI
- AWS Systems Manager Session Manager
- VPC endpoints
- Terraform AWS provider

## Sources Consulted
- AWS CLI Command Reference: modify-vpc-attribute - https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-vpc-attribute.html
- AWS CLI Command Reference: run-instances - https://docs.aws.amazon.com/cli/latest/reference/ec2/run-instances.html
- AWS CLI Command Reference: create-vpc-endpoint - https://docs.aws.amazon.com/cli/latest/reference/ec2/create-vpc-endpoint.html
- AWS CLI Command Reference: authorize-security-group-egress - https://docs.aws.amazon.com/cli/latest/reference/ec2/authorize-security-group-egress.html
- Amazon VPC User Guide: NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/vpc-nat-gateway.html
- Amazon VPC User Guide: Create a security group for your VPC - https://docs.aws.amazon.com/vpc/latest/userguide/creating-security-groups.html
- AWS Systems Manager User Guide: Configure instance permissions required for Systems Manager - https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-instance-permissions.html
- AWS Systems Manager User Guide: Improve the security of EC2 instances by using VPC endpoints for Systems Manager - https://docs.aws.amazon.com/systems-manager/latest/userguide/setup-create-vpc.html
- Elastic Load Balancing User Guide: Application Load Balancers - https://docs.aws.amazon.com/elasticloadbalancing/latest/application/application-load-balancers.html
- Amazon VPC User Guide: Pricing for NAT gateways - https://docs.aws.amazon.com/vpc/latest/userguide/nat-gateway-pricing.html
- Terraform Registry: aws_ami data source - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform Registry: aws_instance resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform Registry: aws_iam_instance_profile resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/iam_instance_profile
- Terraform Registry: aws_nat_gateway resource - https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/nat_gateway

## Issues Found
- The AWS CLI examples for enabling VPC DNS support and DNS hostnames used bare `--enable-dns-support` and `--enable-dns-hostnames` flags. The AWS CLI documents these parameters as structures with a `Value` boolean, so the commands were updated to pass `{"Value":true}`.
- The security group section explicitly authorized an all-traffic outbound rule immediately after creating a new security group. New VPC security groups already include the allow-all outbound rule, so that command can fail with a duplicate permission error. The command was replaced with a note that the default outbound rule is already present.
- The EC2 launch command used placeholder AMI ID `ami-0abc123`, which would not work. The snippet now retrieves the latest Amazon Linux 2023 AMI ID from the AWS public SSM parameter before launching the instance.
- The EC2 launch command referenced `SSMInstanceProfile` without showing how to create the backing IAM role, policy attachment, and instance profile. The missing AWS CLI commands were added.
- The Terraform configuration referenced `aws_iam_instance_profile.ssm.name` without defining the IAM role, managed policy attachment, or instance profile. The missing Terraform resources were added, and the instance now depends on the SSM policy attachment.
- The Terraform configuration hardcoded placeholder AMI ID `ami-0abc123`. It now uses the `aws_ami` data source to select the latest matching Amazon Linux 2023 AMI.
- The VPC endpoint example reused the application security group for a CloudWatch interface endpoint. That security group only allowed inbound HTTP from the ALB, so instances would not be able to connect to the endpoint on port 443. The example now creates a dedicated endpoint security group that allows HTTPS from the application security group.
- The CloudWatch interface endpoint example did not enable private DNS, which is needed for standard regional service names to resolve to the endpoint ENIs. The command now includes `--private-dns-enabled`.
- The NAT Gateway cost statement gave us-east-1 prices without naming the Region. The text now identifies the pricing as us-east-1 specific.
- The NAT Gateway creation explanation said all NAT gateways need an Elastic IP and public subnet. The text now specifies public NAT gateways, matching AWS's distinction between public and private NAT gateways.

## Review Notes
The tutorial is technically valid after the fixes. The post still uses a simplified single-NAT design in the main walkthrough, then correctly describes one NAT gateway per AZ for production high availability later in the article. The AWS CLI and Terraform snippets were reviewed for current syntax, but they were not executed against an AWS account.
