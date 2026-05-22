# Validation Summary: How to Use the remote-exec Provisioner in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform
- Terraform provisioners
- Terraform `remote-exec` and `file` provisioners
- Terraform connection blocks
- SSH
- WinRM
- cloud-init
- AWS EC2

## Sources Consulted
- HashiCorp Terraform provisioners documentation: https://developer.hashicorp.com/terraform/language/provisioners
- HashiCorp Terraform resource block reference, including `connection`, `file`, and `remote-exec` arguments: https://developer.hashicorp.com/terraform/language/block/resource
- HashiCorp Terraform sensitive data documentation: https://developer.hashicorp.com/terraform/language/manage-sensitive-data
- HashiCorp Terraform source for `remote-exec` script collection and execution: https://github.com/hashicorp/terraform/blob/main/internal/builtin/provisioners/remote-exec/resource_provisioner.go
- HashiCorp Terraform source for SSH script upload behavior: https://github.com/hashicorp/terraform/blob/main/internal/communicator/ssh/communicator.go
- cloud-init FAQ for `cloud-init status --wait`: https://docs.cloud-init.io/en/23.3.3/reference/faq.html
- OneUptime local-exec post link check: https://oneuptime.com/blog/post/2026-02-23-terraform-local-exec-provisioner/view

## Issues Found
- The post said each `inline` command is executed separately and that any non-zero command stops later commands. Terraform actually combines `inline` entries into a temporary script, then executes that script. I updated the explanation to describe script execution and to recommend `set -e` or `&&` for strict fail-fast behavior.
- The post said a `script` file must already be executable. For SSH targets, Terraform uploads the script and marks the remote temporary script executable. I updated the text to explain that a shebang is needed when a specific interpreter is required.
- The environment-loading example used `source`, but Terraform's default SSH script shebang is `/bin/sh` when no shebang is provided, and `source` is not POSIX shell syntax. I changed it to `. /tmp/app.env`.

## Review Notes
The remaining examples are illustrative and depend on external resources such as valid AMI IDs, security groups, SSH keys, package manager availability, and instance OS defaults. Terraform provisioners remain a last-resort mechanism per HashiCorp guidance; the post correctly recommends user data, baked images, configuration management, or AWS Systems Manager where appropriate.
