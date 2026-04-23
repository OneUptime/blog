# Validation Summary: Remote-Exec Provisioner in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- `remote-exec` provisioner
- Provisioner `connection` blocks
- SSH
- WinRM
- AWS EC2 examples (`aws_instance`, `aws_key_pair`, `aws_security_group`)
- `terraform_data`

## Sources Consulted
- OpenTofu `remote-exec` provisioner docs: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu provisioner connection settings: https://opentofu.org/docs/v1.8/language/resources/provisioners/connection/
- OpenTofu `pathexpand` function docs: https://opentofu.org/docs/language/functions/pathexpand/
- OpenTofu provisioners overview: https://opentofu.org/docs/v1.7/language/resources/provisioners/syntax/
- OpenTofu provisioners without a resource: https://opentofu.org/docs/language/resources/provisioners/null_resource/
- OpenTofu `terraform_data` resource docs: https://opentofu.org/docs/language/resources/tf-data/
- AWS provider `aws_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- AWS provider `aws_key_pair` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/key_pair
- AWS provider `aws_security_group` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group

## Issues Found
- The SSH example used `file("~/.ssh/id_rsa")`. OpenTofu's `file()` function reads a literal path and does not expand `~`, so this was corrected to `file(pathexpand("~/.ssh/id_rsa"))`.
- The post recommended `null_resource` for re-running provisioners. Current OpenTofu documentation recommends the built-in `terraform_data` resource for provisioners that are not directly attached to a managed resource, so the section and example were updated accordingly.
- The troubleshooting guidance suggested adding `depends_on` when SSH access was not yet ready. That does not directly wait for SSH readiness, so the text was corrected to recommend increasing `timeout` and retrying once SSH is available.
- The inline shell guidance was updated from `set -e` to `set -o errexit` as the first inline command to match the documented `remote-exec` behavior for concatenated `inline` commands.
- The logging example wrote to `/var/log` using plain `tee`, which would typically fail for the non-root `ubuntu` user shown elsewhere in the post. This was corrected to `sudo tee`.

## Review Notes
The post is technically accurate after the above fixes. One additional caveat from the OpenTofu docs is that destroy-time provisioners do not run when `create_before_destroy = true`, and they also do not run for tainted resources.
