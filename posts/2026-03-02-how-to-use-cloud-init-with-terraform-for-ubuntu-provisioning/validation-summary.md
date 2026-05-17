# Validation Summary: How to Use cloud-init with Terraform for Ubuntu Provisioning

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- cloud-init (cloud-config YAML, runcmd, write_files, users module)
- Terraform (AWS provider ~> 5.0, cloudinit provider ~> 2.3)
- AWS EC2 (Ubuntu 22.04 AMI lookup, security groups, instances)
- Ubuntu 22.04 (Jammy Jellyfish)
- Docker (apt repository install on Ubuntu)
- UFW firewall
- Nginx

## Sources Consulted
- cloud-init official documentation: https://cloudinit.readthedocs.io/en/latest/
- cloud-init module reference (Users, Packages, Runcmd, Write Files): https://cloudinit.readthedocs.io/en/latest/reference/modules.html
- cloud-init CLI reference (`schema`, `status`): https://cloudinit.readthedocs.io/en/latest/reference/cli.html
- Terraform AWS provider docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs
- Terraform `aws_instance` resource (including `user_data_replace_on_change`): https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Terraform `cloudinit_config` data source: https://registry.terraform.io/providers/hashicorp/cloudinit/latest/docs/data-sources/cloudinit_config
- Canonical's AWS account ID for Ubuntu AMIs (099720109477): https://ubuntu.com/server/docs/cloud-images/amazon-ec2
- Docker install instructions for Ubuntu: https://docs.docker.com/engine/install/ubuntu/

## Issues Found
No technical issues found.

## Review Notes
- The Canonical AWS owner ID `099720109477` and the AMI filter `ubuntu/images/hvm-ssd/ubuntu-jammy-22.04-amd64-server-*` are correct for Ubuntu 22.04 LTS (Jammy).
- `user_data_replace_on_change` is valid in AWS provider 4.x+ and works as described under `~> 5.0`.
- The `cloudinit_config` data source arguments (`gzip`, `base64_encode`, `part` with `filename`/`content_type`/`content`) and MIME content types (`text/cloud-config`, `text/x-shellscript`) are correct.
- The cloud-init `users.sudo` key still accepts a list of strings as shown; the simpler string form is also valid in current versions.
- The `runcmd` block accepts both list-of-list and list-of-string forms; both forms are used in the post and are valid.
- The Docker install snippet uses the modern `gpg --dearmor` + `signed-by=` keyring pattern, which matches Docker's current Ubuntu install instructions.
- `null_resource` with `remote-exec` still works; `terraform_data` (introduced in Terraform 1.4) is a more modern alternative, but `null_resource` is not deprecated.
- The example security group does not pin a `vpc_id`, which is fine for the default VPC but worth noting for production use in custom VPCs (out of scope for a fix).
- The instance does not explicitly set `associate_public_ip_address = true`; it relies on default-VPC behavior to assign a public IP for the `public_ip` output to be populated. This is correct for the default-VPC scenario the post implicitly targets.
