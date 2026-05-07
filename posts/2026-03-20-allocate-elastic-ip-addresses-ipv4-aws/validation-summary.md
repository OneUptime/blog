# Validation Summary: How to Allocate Elastic IP Addresses for IPv4 in AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS Elastic IP
- Amazon EC2
- AWS CLI
- OpenTofu
- Terraform AWS Provider
- NAT Gateway

## Sources Consulted
- AWS EC2 User Guide, Elastic IP addresses: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS CLI Command Reference, `allocate-address`: https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- AWS CLI Command Reference, `associate-address`: https://docs.aws.amazon.com/cli/latest/reference/ec2/associate-address.html
- AWS CLI Command Reference, `describe-addresses`: https://docs.aws.amazon.com/cli/latest/reference/ec2/describe-addresses.html
- AWS EC2 API Reference, `DisassociateAddress`: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_DisassociateAddress.html
- AWS EC2 API Reference, `ReleaseAddress`: https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_ReleaseAddress.html
- Amazon VPC Pricing: https://aws.amazon.com/vpc/pricing/
- Terraform AWS Provider docs source, `aws_eip`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eip.html.markdown
- Terraform AWS Provider docs source, `aws_eip_association`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eip_association.html.markdown
- Terraform AWS Provider docs source, `aws_nat_gateway`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/nat_gateway.html.markdown

## Issues Found
- The description said the post covered the AWS console, but the post only contained CLI and OpenTofu examples. I changed the description to match the actual implementation covered in the post.
- The opening explanation said Elastic IPs come from Amazon's pool only. AWS also supports Elastic IPs from custom IPv4 address pools, so I corrected that statement.
- The billing wording implied the main cost concern was only unused Elastic IPs. Current AWS pricing charges for public IPv4 addresses, including associated Elastic IPs, so I updated the release comment and summary to reflect that accurately.

## Review Notes
- The AWS CLI still documents the legacy `standard` domain in some Elastic IP commands for backward compatibility, but the post correctly uses `--domain vpc` for current VPC-based workflows.
