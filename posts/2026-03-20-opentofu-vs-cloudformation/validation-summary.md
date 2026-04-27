# Validation Summary: OpenTofu vs CloudFormation: Which Should You Use?

## Status
validated

## Post Type
Comparison guide

## Technologies Covered
- OpenTofu (Terraform fork)
- AWS CloudFormation
- HCL (HashiCorp Configuration Language)
- AWS EC2 (VPC, Subnet resources)
- former2 (resource export tool)
- AWS provider for OpenTofu/Terraform (`aws_vpc`, `aws_subnet`)
- Terragrunt
- CloudFormation StackSets

## Sources Consulted
- OpenTofu documentation: https://opentofu.org/docs/
- Terraform AWS provider docs (`aws_vpc`, `aws_subnet`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- AWS CloudFormation docs (AWS::EC2::VPC, AWS::EC2::Subnet): https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/
- former2 GitHub repository: https://github.com/iann0036/former2
- former2 CLI documentation: https://github.com/iann0036/former2/tree/master/cli
- OpenTofu license (MPL 2.0): https://github.com/opentofu/opentofu/blob/main/LICENSE
- CloudFormation drift detection docs: https://docs.aws.amazon.com/AWSCloudFormation/latest/UserGuide/using-cfn-stack-drift.html

## Issues Found

1. **former2 installation command was incorrect.**
   - Original: `pip install former2`
   - Issue: former2 is not a Python package. Its CLI is distributed via npm (`npm install -g former2`). The web/browser version is the primary distribution.
   - Fix: Changed to `npm install -g former2`.

2. **former2 CLI flag was incorrect.**
   - Original: `former2 generate --services EC2 --output terraform`
   - Issue: The former2 CLI does not support `--output <format>`. Output format is selected via dedicated flags such as `--output-terraform <filename>`, `--output-cloudformation <filename>`, etc.
   - Fix: Changed to `former2 generate --services EC2 --output-terraform output.tf`.

## Review Notes

- The HCL examples (`aws_vpc`, `aws_subnet` with `cidr_block`, `enable_dns_hostnames`, `vpc_id`) match the current AWS provider schema.
- The CloudFormation YAML examples (`AWS::EC2::VPC`, `AWS::EC2::Subnet` with `CidrBlock`, `EnableDnsHostnames`, `VpcId`, `Tags`) match current CloudFormation resource specifications.
- OpenTofu's MPL 2.0 license is correct (the project was forked before HashiCorp's BSL relicensing).
- The drift detection comparison ("Manual (`tofu plan`)" vs "Automatic (CloudFormation drift)") is debatable but defensible — CloudFormation has a dedicated drift-detection feature, though it must still be invoked on-demand. Both technically require user action; the wording reflects that CFN has a built-in feature for this.
- `tofu import aws_vpc.main vpc-12345678` syntax is correct.
- OpenTofu now supports native S3 state locking (no DynamoDB required) as of v1.10. The post still mentions both, which remains a valid and common pattern, so no change was made.
- The "3,000+ providers" claim aligns with the current Terraform/OpenTofu Registry size and is reasonable.
