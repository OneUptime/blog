# Validation Summary: How to Create an Elastic IP with OpenTofu on AWS - A Practical Guide

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS Elastic IP
- Amazon EC2
- AWS networking
- HashiCorp AWS provider
- HCL

## Sources Consulted
- AWS EC2 User Guide, "Elastic IP addresses": https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/elastic-ip-addresses-eip.html
- AWS EC2 API Reference, "AllocateAddress": https://docs.aws.amazon.com/AWSEC2/latest/APIReference/API_AllocateAddress.html
- HashiCorp AWS provider docs for `aws_eip`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eip.html.markdown
- HashiCorp AWS provider docs for `aws_eip_association`: https://raw.githubusercontent.com/hashicorp/terraform-provider-aws/main/website/docs/r/eip_association.html.markdown
- OpenTofu CLI docs, "Command: init": https://opentofu.org/docs/v1.11/cli/commands/init/
- OpenTofu CLI docs, "Command: plan": https://opentofu.org/docs/cli/commands/plan/
- OpenTofu CLI docs, "Command: apply": https://opentofu.org/docs/v1.11/cli/commands/apply/

## Issues Found
- The BYOIP example combined `public_ipv4_pool` with `customer_owned_ipv4_pool`. I removed `customer_owned_ipv4_pool` because BYOIP public IPv4 pools and Outposts customer-owned IPv4 pools are separate allocation modes in the AWS EC2 API and provider docs.
- The pricing guidance said charges apply only to Elastic IPs that are unassociated or not attached to running instances. I updated the Best Practices and Conclusion sections to reflect current AWS guidance that charges apply to all public IPv4 addresses, including Elastic IPs whether in use or idle.
- The comment on `domain = "vpc"` said it was required for VPC instances. I changed the comment to describe it as allocating a VPC Elastic IP, which is more accurate to the provider documentation.

## Review Notes
- The `tofu init`, `tofu plan`, and `tofu apply` commands are correct per current OpenTofu CLI documentation.
- The `aws_eip_association` example is valid as written; the AWS provider documents that `aws_eip.id` contains the allocation ID for VPC EIPs.
- The post pins `hashicorp/aws` to `~> 5.0`. That version constraint is older than the current provider release, but the arguments used in the post still match the current provider documentation.
- The AWS provider documentation notes that an internet gateway may need to exist before EIP association in a VPC. The post assumes the referenced public subnet networking already exists.
