# Validation Summary: How to Create an Elastic IP with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS
- Amazon EC2 Elastic IP
- Amazon VPC NAT Gateway
- Elastic Network Interfaces (ENIs)
- AWS provider for OpenTofu/Terraform

## Sources Consulted
- AWS EC2 User Guide: Elastic IP addresses - https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS CLI Command Reference: `allocate-address` - https://docs.aws.amazon.com/cli/latest/reference/ec2/allocate-address.html
- Terraform AWS Provider docs: `aws_eip` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eip.html.markdown
- Terraform AWS Provider docs: `aws_eip_association` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/eip_association.html.markdown
- Terraform AWS Provider docs: `aws_nat_gateway` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/nat_gateway.html.markdown
- Terraform AWS Provider docs: `aws_instance` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- Terraform AWS Provider docs: `aws_network_interface` - https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/network_interface.html.markdown
- Terraform AWS Provider changelog - https://github.com/hashicorp/terraform-provider-aws/blob/main/CHANGELOG.md

## Issues Found
- The NAT Gateway example put the Internet Gateway dependency on `aws_eip`, but the provider documentation recommends the explicit dependency on `aws_nat_gateway` for proper ordering. I moved `depends_on` to the NAT Gateway resource.
- The pricing section said EIPs are charged only when unattached or not associated with a running resource. Current AWS documentation states Elastic IPs are charged whether they are in use or idle, and AWS also charges for all public IPv4 addresses. I updated the heading, body text, and conclusion to reflect current billing behavior.
- The network interface example used the deprecated `network_interface` block on `aws_instance`. I replaced it with `primary_network_interface`, which is the current documented pattern for attaching a primary ENI.
- The ENI example relied on `associate_with_private_ip = aws_network_interface.web.private_ip`. I made the ENI private IP explicit with `private_ips = ["10.0.0.10"]` and associated the EIP to that documented private IP value for clarity and correctness.
- The inline comment on `domain = "vpc"` said it was required and should always be used. The current provider and AWS CLI documentation treat this as optional, so I revised the comment to describe it as an explicit VPC allocation instead of a strict requirement.

## Review Notes
- The remaining HCL examples are consistent with current AWS provider resource arguments and attributes.
- `aws_eip_association` is still valid for EC2 instance association, although `aws_eip` can also manage the association directly when the Elastic IP is created in the same configuration.
- Public IPv4 pricing is operational guidance that AWS can revise over time, so this section should be rechecked in future reviews.
