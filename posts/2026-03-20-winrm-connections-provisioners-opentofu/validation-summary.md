# Validation Summary: How to Configure WinRM Connections for Provisioners in OpenTofu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTofu (Terraform-compatible) `connection` block and provisioners (`file`, `remote-exec`)
- WinRM (Windows Remote Management) — ports 5985 (HTTP) and 5986 (HTTPS)
- AWS EC2 Windows instances (Windows Server 2022 AMI)
- AWS Security Groups
- PowerShell and EC2 user data `<powershell>` script convention
- NTLM / Basic WinRM authentication

## Sources Consulted
- OpenTofu official documentation — Provisioner Connection Settings: https://opentofu.org/docs/language/resources/provisioners/connection/
- AWS EC2 Windows user data documentation (EC2Launch / EC2Config `<powershell>` tags)
- Microsoft WinRM configuration reference (`winrm quickconfig`, `winrm set winrm/config/service` syntax)

## Issues Found
No technical issues found. All `connection` block arguments used (`type`, `user`, `password`, `host`, `https`, `port`, `insecure`, `use_ntlm`, `timeout`) are valid per the OpenTofu docs. Port numbers (5985/5986), PowerShell user data syntax, and the `winrm quickconfig` / `winrm set` commands are accurate.

## Review Notes
- The post intentionally omits the `cacert` and `script_path` connection arguments. These are valid options but not required for the scenarios demonstrated — mentioning them could be a future enhancement.
- The example enables `AllowUnencrypted="true"` and Basic auth for brevity. The post does call out HTTPS as the production recommendation in the "Best Practices" section, which is appropriate.
- When `https = true`, `port` must be set explicitly to `5986` because the connection block default port remains `5985` regardless of the `https` flag — the post correctly shows both being set together.
- Minor stylistic note (not a technical issue): the tag list says "Window" rather than "Windows", and the introduction has a hyphen where an em dash or space-hyphen-space would read more cleanly ("by default-they use WinRM"). Not corrected since the task scope is technical accuracy only.
