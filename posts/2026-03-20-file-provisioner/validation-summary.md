# Validation Summary: How to Use the File Provisioner in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- Terraform-compatible HCL
- OpenTofu provisioners
- AWS EC2
- SSH
- WinRM

## Sources Consulted
- OpenTofu file provisioner docs: https://opentofu.org/docs/language/resources/provisioners/file/
- OpenTofu connection block docs: https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu provisioner syntax docs: https://opentofu.org/docs/v1.7/language/resources/provisioners/syntax/
- OpenTofu `pathexpand` function docs: https://opentofu.org/docs/language/functions/pathexpand/
- OpenTofu `rsadecrypt` function docs: https://opentofu.org/docs/language/functions/rsadecrypt/
- AWS provider `aws_instance` docs: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/instance
- Microsoft WinRM defaults: https://learn.microsoft.com/en-us/windows/win32/winrm/installation-and-configuration-for-windows-remote-management

## Issues Found
- The examples used `file("~/.ssh/...")` for SSH keys. OpenTofu does not expand `~` inside `file()`, so these were changed to `file(pathexpand("~/.ssh/..."))`.
- The directory-copy example uploaded `app-configs/` to `/home/ubuntu/configs`, which is not guaranteed to exist. For SSH uploads, the destination directory must already exist, so the example was changed to copy `app-configs` into `/home/ubuntu`.
- The rendered-template example uploaded directly to `/etc/app/config.conf` while connecting as `ubuntu`. That path is not normally writable by the shown SSH user, so it was changed to `/tmp/app.conf`.
- The Windows WinRM example decrypted `self.password_data` without enabling password retrieval and without setting an EC2 key pair. It was corrected by adding `key_name = aws_key_pair.deploy.key_name` and `get_password_data = true`.
- The Windows WinRM example used `https = true` without setting the typical HTTPS listener port. It was corrected by adding `port = 5986`, which matches standard WinRM-over-HTTPS defaults.
- The bastion-host example uploaded directly to `/etc/app/app.conf` while connecting as `ubuntu`. That destination was changed to `/tmp/app.conf` to match the documented SSH permission model.
- The Windows destination path was changed from escaped backslashes to forward slashes to match OpenTofu’s documented recommendation for Windows paths in quoted strings.

## Review Notes
- The post is technically relevant and salvageable. After the corrections above, the examples align with current OpenTofu documentation.
- The destroy-time provisioner example is valid, but destroy-time provisioners only run while the resource still exists and remain subject to the usual provisioner caveats documented by OpenTofu.
- OpenTofu continues to document provisioners as a last resort; the post already reflects that guidance appropriately.
