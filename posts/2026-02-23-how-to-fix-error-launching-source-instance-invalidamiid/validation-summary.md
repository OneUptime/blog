# Validation Summary: How to Fix Error Launching Source Instance InvalidAMIID

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Terraform (HashiCorp Configuration Language / HCL)
- AWS EC2
- AWS CLI
- AWS Systems Manager (SSM) Parameter Store
- AWS Marketplace
- Amazon Linux 2023
- Ubuntu (Canonical AMIs)
- Windows Server AMIs

## Sources Consulted
- AWS EC2 API error reference (InvalidAMIID.NotFound, InvalidAMIID.Malformed): https://docs.aws.amazon.com/AWSEC2/latest/APIReference/errors-overview.html
- AWS CLI ec2 describe-images reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-images.html
- AWS CLI ec2 modify-image-attribute reference: https://docs.aws.amazon.com/cli/latest/reference/ec2/modify-image-attribute.html
- Terraform AWS provider aws_ami data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- Terraform AWS provider aws_ssm_parameter data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ssm_parameter
- Terraform aws_instance resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform lifecycle preconditions (introduced in Terraform 1.2): https://developer.hashicorp.com/terraform/language/expressions/custom-conditions
- AWS public parameters for Amazon Linux 2023 AMIs in SSM Parameter Store: https://docs.aws.amazon.com/linux/al2023/ug/ec2.html
- Canonical AWS account ID for Ubuntu AMIs (099720109477): https://ubuntu.com/server/docs/cloud-images/amazon-ec2

## Issues Found
No technical issues found.

All technical claims in the post were verified against official AWS and Terraform documentation:

- The two error variants `InvalidAMIID.NotFound` and `InvalidAMIID.Malformed` are accurate AWS EC2 API error codes.
- The Terraform HCL syntax for `aws_instance`, `data "aws_ami"`, `data "aws_ssm_parameter"`, `lifecycle.precondition`, and `variable` validation blocks is correct.
- The AWS CLI commands (`describe-images`, `modify-image-attribute`) use correct flags and JMESPath query syntax.
- Canonical's AWS account ID `099720109477` is correct for official Ubuntu AMIs.
- The Ubuntu AMI naming pattern `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*` is correct for Ubuntu 22.04 Jammy Jellyfish.
- The SSM Parameter Store path `/aws/service/ami-amazon-linux-latest/al2023-ami-kernel-6.1-x86_64` is a real, published AWS public parameter.
- The regex `^ami-[a-f0-9]+$` correctly matches AMI ID format (lowercase hex after `ami-` prefix).
- AMI region-specificity claim is accurate — AMI IDs differ across regions even for the same image.

## Review Notes
- The `lifecycle.precondition` block requires Terraform 1.2 or later. Most users will be on a current version, but worth noting for anyone on older Terraform.
- The Ubuntu filter uses `hvm-ssd` which is the correct path for Jammy 22.04. Note that for newer Ubuntu releases like Noble 24.04, Canonical uses `hvm-ssd-gp3` in the path — if readers adapt the example to newer Ubuntu versions, they may need to adjust accordingly.
- The post correctly mentions that some scenarios (like AMI permission issues) result in a `NotFound` error rather than an access denied error — this is accurate AWS behavior to prevent information disclosure about AMI existence.
- Example AMI IDs used throughout (`ami-0abc123def456789`) are illustrative placeholders and not real AMIs, which is appropriate for documentation.
