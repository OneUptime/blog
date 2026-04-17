# Validation Summary: How to Configure WinRM Connections in OpenTofu Provisioners

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- OpenTofu / Terraform (HCL)
- WinRM (Windows Remote Management)
- PowerShell
- AWS EC2 (Windows instances)
- IIS (Web-Server Windows feature)

## Sources Consulted
- OpenTofu connection block documentation: https://opentofu.org/docs/language/resources/provisioners/connection/
- Terraform provisioner connection documentation: https://developer.hashicorp.com/terraform/language/resources/provisioners/connection
- Microsoft WinRM installation and configuration: https://learn.microsoft.com/en-us/windows/win32/winrm/installation-and-configuration-for-windows-remote-management
- Install-WindowsFeature cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/servermanager/install-windowsfeature
- Start-Service cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/start-service
- New-NetFirewallRule cmdlet reference: https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule
- AWS security group rule resource: https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/security_group_rule

## Issues Found
No technical issues found.

All verified items:
- `connection` block arguments (`type`, `user`, `password`, `host`, `port`, `https`, `insecure`, `timeout`) are valid OpenTofu/Terraform winrm connection fields.
- WinRM default ports (5985 HTTP, 5986 HTTPS) are correct.
- PowerShell commands `Enable-PSRemoting -Force`, `Set-Item` on `WSMan:\localhost\Service\Auth\Basic` and `AllowUnencrypted`, and `New-NetFirewallRule` are syntactically correct and achieve the described effect.
- `Install-WindowsFeature -Name Web-Server -IncludeManagementTools` is correct for installing IIS.
- `Start-Service W3SVC` correctly starts the IIS service.
- HCL string escaping for Windows paths (`C:\\Temp\\configure.ps1`) is correct.
- `aws_security_group_rule` with `from_port = 5985` and `to_port = 5986` correctly opens both HTTP and HTTPS WinRM.

## Review Notes
- Additional valid WinRM connection arguments exist but are not mentioned (e.g., `use_ntlm`, `cacert`, `script_path`) — omission is reasonable for an introductory tutorial.
- `insecure = true` with `https = false` is effectively a no-op (the `insecure` flag controls HTTPS certificate validation), but it is not syntactically invalid.
- The tag `Window` in the frontmatter appears to be a typo of `Windows`, but this is stylistic rather than a technical error so it was left unchanged.
- Enabling `AllowUnencrypted` and basic auth over HTTP is appropriate for the tutorial context but, as the post already notes, HTTPS should be preferred in production.
