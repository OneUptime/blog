# Validation Summary: Instance Metadata and User Data with OpenTofu on AWS

## Status
validated

## Post Type
Guide

## Technologies Covered
- AWS EC2
- EC2 Instance Metadata Service (IMDSv2)
- OpenTofu
- AWS provider for Terraform/OpenTofu
- cloud-init
- Bash user data scripts

## Sources Consulted
- AWS EC2 instance metadata retrieval docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/instancedata-data-retrieval.html
- AWS EC2 instance metadata options docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/configuring-IMDS-new-instances.html
- AWS EC2 user data docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- OpenTofu `templatefile()` docs: https://opentofu.org/docs/language/functions/templatefile/
- HashiCorp Template provider deprecation docs: https://registry.terraform.io/providers/hashicorp/template/latest/docs
- AWS provider `aws_instance` source docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- AWS provider `aws_launch_template` source docs: https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/launch_template.html.markdown
- cloud-init provider `cloudinit_config` source docs: https://github.com/hashicorp/terraform-provider-cloudinit/blob/main/docs/data-sources/config.md

## Issues Found
- The introduction implied that EC2 user data is always a startup script executed by cloud-init. I changed this to reflect AWS documentation: user data is launch-time data, and on Linux it can be shell scripts or cloud-init directives interpreted by the instance.
- The templated user data example used `data "template_file"`, which is from the deprecated Template provider. I replaced it with OpenTofu's built-in `templatefile()` function, which is the current supported approach.
- The multi-part cloud-init example rendered gzip-compressed, base64-encoded data and passed it to `aws_instance.user_data`. I changed this to `user_data_base64`, which is the correct argument for base64-encoded binary user data in the AWS provider.
- The inline shell example used `apt-get` without stating that it assumes a Debian/Ubuntu-style AMI. I added a short comment to make the operating system assumption explicit.
- The IMDSv2 best-practice note said requiring IMDSv2 would "prevent SSRF attacks." I changed that wording to "add defense in depth" because AWS documents IMDSv2 as a mitigation layer, not an absolute prevention guarantee.

## Review Notes
- The launch template example is technically correct because `aws_launch_template.user_data` expects base64-encoded input. `filebase64()` is slightly more idiomatic than `base64encode(file(...))`, but no correction was required.
- The examples assume Linux AMIs that support shell-script or cloud-init style user data handling. That is standard for common EC2 Linux images, but behavior differs on Windows because launch agents handle user data there.
