# Validation Summary: How to Use cloud-init Instead of OpenTofu Provisioners

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2
- cloud-init
- HCL / OpenTofu configuration
- Bash user-data scripts

## Sources Consulted
- OpenTofu provisioner guidance: https://opentofu.org/docs/v1.7/language/resources/provisioners/syntax/
- OpenTofu `remote-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- AWS provider `aws_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider v6 upgrade guide: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/guides/version-6-upgrade
- Amazon EC2 user data docs: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/user-data.html
- cloud-init user-data formats: https://docs.cloud-init.io/en/22.4.2/topics/format.html
- cloud-init logging: https://cloudinit.readthedocs.io/en/22.1_a/topics/logging.html
- cloud-init CLI reference: https://cloudinit.readthedocs.io/en/stable/reference/cli.html
- Amazon Linux 2023 package management: https://docs.aws.amazon.com/linux/al2023/ug/package-management.html

## Issues Found
- The `aws_instance` examples incorrectly passed base64-encoded strings to `user_data`. I changed them to pass plain-text heredoc or `templatefile()` output directly, because the AWS provider reserves `user_data_base64` for pre-encoded or binary userdata.
- The shell example used the AL2-specific `amazon-linux-extras` install path while the rest of the post assumed regular package installation. I changed it to `yum install -y nginx`, which is valid on Amazon Linux 2023 and keeps the examples consistent.
- The template example wrote `/etc/app/config.env` without creating `/etc/app` first. I added `mkdir -p /etc/app` so the script works as written.
- The `remote-exec` drawback "Breaks when instances are in private subnets" was too absolute. I changed it to explain that private-subnet instances usually need extra networking or bastion access.
- The summary claimed the approach was idempotent. I removed that claim because arbitrary shell-script or `runcmd` userdata is not inherently idempotent.

## Review Notes
- By default, EC2 user data and cloud-init directives run only on first boot unless you explicitly configure repeat execution.
- The examples assume an EC2 Linux image that includes cloud-init, such as Amazon Linux AMIs.
- If you intentionally need pre-encoded or compressed userdata, `aws_instance.user_data_base64` is the correct argument instead of `user_data`.
