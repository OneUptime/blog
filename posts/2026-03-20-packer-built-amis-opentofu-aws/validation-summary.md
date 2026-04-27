# Validation Summary: How to Use Packer-Built AMIs in OpenTofu on AWS

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Packer (HashiCorp) with the `amazon-ebs` builder
- Packer plugin: `github.com/hashicorp/amazon`
- OpenTofu / Terraform `aws` provider
- AWS EC2 AMIs, Launch Templates, Auto Scaling Groups
- Ubuntu 22.04 (Jammy) base image from Canonical
- Ansible provisioner (referenced)
- HCL2 configuration language

## Sources Consulted
- Canonical Ubuntu on AWS documentation: <https://documentation.ubuntu.com/aws/aws-how-to/instances/find-ubuntu-images/>
- Packer Amazon EBS builder docs: <https://developer.hashicorp.com/packer/integrations/hashicorp/amazon/latest/components/builder/ebs>
- Packer manifest post-processor docs: <https://developer.hashicorp.com/packer/docs/post-processors/manifest>
- Terraform AWS provider `aws_ami` data source: <https://registry.terraform.io/providers/hashicorp/aws/latest/docs/data-sources/ami>
- Terraform AWS provider `aws_launch_template`: <https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/launch_template>
- Terraform AWS provider `aws_autoscaling_group` (instance_refresh): <https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/autoscaling_group>
- OpenTofu dynamic blocks documentation: <https://opentofu.org/docs/language/expressions/dynamic-blocks/>

## Issues Found
- **Ubuntu 22.04 AMI name filter was missing the codename `jammy`.** The filter pattern was `ubuntu/images/hvm-ssd/ubuntu-22.04-amd64-server-*`, which does not match Canonical's published AMI names. Canonical's AMI naming convention is `ubuntu/images/${VIRT}-${STORAGE}/ubuntu-${SUITE}-${VERSION}-${ARCH}-server-${SERIAL}`, so the correct pattern for Ubuntu 22.04 amd64 is `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*`. Fixed by inserting `jammy-` into the filter on the Packer source block.

## Review Notes
- Canonical owner ID `099720109477` is correct.
- Packer template uses HCL2 syntax with `required_plugins`, `source`, `build`, and `post-processor` blocks correctly.
- `{{timestamp}}` and `{{isotime}}` are valid Packer template engine functions.
- `data "aws_ami"` filters using `tag:<Name>` are valid; `state` filter (`available`) is a valid AMI describe filter.
- `data.aws_ami.web_server.tags["Version"]` is valid — the `aws_ami` data source exposes `tags` as a map.
- `aws_autoscaling_group.instance_refresh` with `strategy = "Rolling"` and `min_healthy_percentage` is correct for the AWS provider.
- Ubuntu 22.04 (Jammy) is in standard support until April 2027 and ESM beyond that, so the example remains current as of the validation date. Future updates may want to switch to Ubuntu 24.04 (Noble), whose pattern lives under `ubuntu/images/hvm-ssd-gp3/ubuntu-noble-24.04-amd64-server-*`.
- The Packer `t3.medium` build instance type is reasonable; users in regions without t3 should adjust.
