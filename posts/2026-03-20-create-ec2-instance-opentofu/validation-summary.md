# Validation Summary: How to Create an EC2 Instance with OpenTofu

## Status
validated

## Post Type
Tutorial / Guide — walks through provisioning a single AWS EC2 instance with OpenTofu, including AMI lookup, security group, key pair, instance, outputs, and variables.

## Technologies Covered
- OpenTofu (HCL2 configuration language)
- AWS EC2 (instance, security group, key pair, EBS root volume)
- AWS AMI data source (Canonical Ubuntu 22.04)
- `hashicorp/tls` provider (`tls_private_key`)
- `hashicorp/local` provider (`local_sensitive_file`)
- cloud-init / user_data shell bootstrap (Nginx on Ubuntu)

## Sources Consulted
- AWS provider — `aws_instance` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider — `aws_ami` data source: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami
- AWS provider — `aws_security_group` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group
- AWS provider — `aws_key_pair` resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/key_pair
- TLS provider — `tls_private_key`: https://registry.terraform.io/providers/hashicorp/tls/latest/docs/resources/private_key
- Local provider — `local_sensitive_file`: https://registry.terraform.io/providers/hashicorp/local/latest/docs/resources/sensitive_file
- Canonical Ubuntu AMI Locator (owner ID `099720109477` and naming pattern): https://cloud-images.ubuntu.com/locator/ec2/
- HCL2 Native Syntax Specification (block/argument grammar): https://github.com/hashicorp/hcl/blob/main/hclsyntax/spec.md
- OpenTofu lifecycle meta-argument docs: https://opentofu.org/docs/language/meta-arguments/lifecycle/

## Issues Found
1. **Incorrect Ubuntu 22.04 AMI name filter.** The data source filter used `ubuntu/images/hvm-ssd/ubuntu-22.04-amd64-server-*`, which omits the release codename and does not match Canonical's documented EC2 image naming pattern (`ubuntu/images/$VIRT-$VOL/ubuntu-$CODENAME-$VERSION-$ARCH-$PRODUCT`). As written, the data source would return zero AMIs and the example would fail at apply time. Updated to `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*`.
2. **Invalid HCL2 syntax in the variables snippet.** The `allowed_ssh_cidr` variable was defined as `variable "allowed_ssh_cidr" { type = string; default = "0.0.0.0/0" }`. HCL2 does not support semicolons as attribute separators inside a block body; one-line blocks may contain at most one attribute. Rewrote both `environment` and `allowed_ssh_cidr` as multi-line blocks so they parse correctly.
3. **Misleading lifecycle comment.** The original comment claimed `create_before_destroy = true` would "Replace the instance if AMI or user data changes." `create_before_destroy` does not trigger replacement — it only changes the order of operations when a replacement is already required (which the AWS provider triggers on its own when `ami` or `user_data` change). Updated the comment to describe what the meta-argument actually does.

## Review Notes
- Canonical's owner ID `099720109477` is correct for Ubuntu AMIs in commercial AWS regions.
- Ubuntu 22.04 (Jammy) is in standard support until April 2027; the example will remain current for some time. Readers targeting newer releases can swap the filter to `ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*` for Ubuntu 24.04.
- The `aws_security_group` resource shown is fine, but for new code HashiCorp now recommends the split `aws_vpc_security_group_ingress_rule` / `aws_vpc_security_group_egress_rule` resources to avoid spurious diffs. Either form is supported; this is a forward-looking note rather than a correction.
- The post references `aws_vpc.main` and `aws_subnet.public` without defining them; readers must supply these elsewhere in their configuration. This matches the post's stated focus on the EC2 portion only.
- `vpc_security_group_ids`, `associate_public_ip_address`, `root_block_device { volume_type = "gp3" ... }`, and `key_name` are all current attribute names on `aws_instance` and behave as described.
