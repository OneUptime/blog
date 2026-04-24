# Validation Summary: How to Use Provisioners with Connection Blocks in OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTofu
- AWS EC2
- AWS provider `aws_instance`
- SSH
- WinRM
- HCL / Infrastructure as Code

## Sources Consulted
- OpenTofu docs: Provisioner Connection Settings — https://opentofu.org/docs/language/resources/provisioners/connection/
- OpenTofu docs: `remote-exec` Provisioner — https://opentofu.org/docs/language/resources/provisioners/remote-exec/
- OpenTofu docs: `file` Provisioner — https://opentofu.org/docs/language/resources/provisioners/file/
- OpenTofu docs: `pathexpand` Function — https://opentofu.org/docs/language/functions/pathexpand/
- OpenTofu docs: `rsadecrypt` Function — https://opentofu.org/docs/language/functions/rsadecrypt/
- OpenTofu source: WinRM communicator behavior — https://github.com/opentofu/opentofu/blob/v1.11.0/internal/communicator/winrm/communicator.go
- OpenTofu source: `remote-exec` script upload and execution flow — https://github.com/opentofu/opentofu/blob/v1.11.0/internal/builtin/provisioners/remote-exec/resource_provisioner.go
- AWS provider docs: `aws_instance` resource (`get_password_data`, `password_data`, `key_name`) — https://github.com/hashicorp/terraform-provider-aws/blob/main/website/docs/r/instance.html.markdown
- AWS EC2 docs: Key pairs and Windows password decryption — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-key-pairs.html
- AWS EC2 docs: Windows Administrator password generation and change flow — https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/ec2-windows-passwords.html
- OpenTofu release notes: `v1.12.0-beta1` WinRM deprecation notice — https://github.com/opentofu/opentofu/releases/tag/v1.12.0-beta1

## Issues Found
- The basic SSH example used `file("~/.ssh/id_rsa")`, but `file()` does not expand `~`. I changed it to `file(pathexpand("~/.ssh/id_rsa"))` and applied the same fix to the other key-path examples.
- The introduction described SSH as a Linux/Mac-only path. I changed that wording to just `SSH` because OpenTofu also supports SSH connections to Windows targets.
- The section titled `SSH with Agent Forwarding` was technically incorrect. The `agent` argument controls SSH agent authentication, not SSH agent forwarding, so I corrected the heading and inline comment.
- The Windows example used `password = var.admin_password`, which does not match the normal AWS Windows AMI flow. I changed it to use `key_name`, `get_password_data = true`, and `rsadecrypt(self.password_data, file(pathexpand(var.private_key_path)))`.
- The WinRM example set `insecure = true` while `https = false`. `insecure` only applies to HTTPS certificate validation, so I removed it.
- The WinRM `remote-exec` command used PowerShell pipeline syntax without explicitly invoking PowerShell. I changed it to `powershell -Command ...` so it matches OpenTofu's uploaded-script execution behavior over WinRM.
- I increased the Windows connection timeout from `10m` to `15m` to better align with AWS's documented Windows password availability and boot timing.

## Review Notes
- Reviewed against current OpenTofu 1.11.x documentation and official AWS/AWS provider references as of 2026-04-24.
- OpenTofu `v1.12.0-beta1` release notes announce that the WinRM connection type is deprecated and expected to begin erroring in `v1.13`. The post is still valid for current 1.11.x documentation, but the WinRM guidance will need a follow-up update as newer OpenTofu releases become the normal baseline.
