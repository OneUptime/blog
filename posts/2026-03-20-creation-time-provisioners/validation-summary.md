# Validation Summary: How to Use Creation-Time Provisioners in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible IaC tool)
- HCL (HashiCorp Configuration Language)
- AWS EC2 (`aws_instance`, `aws_ami`, `aws_key_pair`)
- `local-exec` and `remote-exec` provisioners
- SSH `connection` block
- `tofu` CLI (`taint`, `apply`)
- cloud-init / `user_data` (referenced as the recommended alternative)

## Sources Consulted
- OpenTofu documentation - Provisioners: https://opentofu.org/docs/language/resources/provisioners/syntax/
- OpenTofu documentation - `local-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/local-exec/
- OpenTofu documentation - `remote-exec` provisioner: https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu documentation - Provisioner `connection` block: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu CLI - `tofu taint`: https://opentofu.org/docs/cli/commands/taint/
- OpenTofu CLI - `tofu apply` with `-replace`: https://opentofu.org/docs/cli/commands/apply/
- Terraform Registry - AWS provider `aws_instance` resource (provider behavior is shared with OpenTofu)

## Issues Found
No technical issues found.

All code samples, command-line invocations, and behavioral claims align with the official OpenTofu provisioner documentation:
- `local-exec` correctly described as running on the machine running OpenTofu, with valid `${self.public_ip}` interpolation.
- `remote-exec` example uses a syntactically correct `connection` block with `type`, `user`, `private_key`, and `host`.
- `on_failure` values (`continue`, `fail`) are correctly written as unquoted keywords, not strings.
- Default `on_failure = fail` behavior (resource is marked tainted on failure) is accurate.
- `tofu taint <address>` followed by `tofu apply` is a valid way to force re-creation and re-run creation-time provisioners.
- The recommendation to prefer cloud-init / `user_data` matches official OpenTofu guidance.

## Review Notes
- Although `tofu taint` is still supported, OpenTofu (and Terraform) recommend `tofu apply -replace=<address>` as the modern equivalent. The post's use of `taint` is not wrong, but a future revision could mention `-replace` as the preferred path.
- The third bullet under "When Provisioners Are Acceptable" is contextually misplaced: it states that provisioners are NOT suitable for private-network/no-SSH cases, which belongs under a "when not to use" heading. The underlying claim is technically correct (use cloud-init for private instances), so it was left unchanged per the instruction to only fix technical errors.
- The `remote-exec` example installs nginx via `sudo yum install -y nginx`. This works on Amazon Linux 2 if EPEL or `amazon-linux-extras` has nginx enabled, and on Amazon Linux 2023 `dnf` is the modern package manager (`yum` is aliased). The example is illustrative of provisioner structure rather than a guaranteed-runnable bootstrap, so no change was made.
