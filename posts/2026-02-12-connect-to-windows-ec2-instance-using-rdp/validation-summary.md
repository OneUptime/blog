# Validation Summary: How to Connect to a Windows EC2 Instance Using RDP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS EC2 Windows instances
- Remote Desktop Protocol (RDP)
- AWS security groups
- AWS Systems Manager Fleet Manager
- Windows Server administration
- Windows Firewall PowerShell cmdlets
- Linux RDP clients: Remmina and FreeRDP/xfreerdp

## Sources Consulted
- AWS EC2 User Guide: Connect to your Windows instance using RDP: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connecting_to_windows_instance.html
- AWS EC2 User Guide: Connect to your Windows instance using an RDP client: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/connect-rdp.html
- AWS EC2 User Guide: Troubleshoot issues connecting to your Amazon EC2 Windows instance: https://docs.aws.amazon.com/AWSEC2/latest/UserGuide/troubleshoot-connect-windows-instance.html
- AWS Systems Manager User Guide: Connecting to a Windows Server managed instance using Remote Desktop: https://docs.aws.amazon.com/systems-manager/latest/userguide/fleet-manager-remote-desktop-connections.html
- Microsoft Learn: Windows App connection documentation: https://learn.microsoft.com/en-us/windows-app/get-started-connect-devices-desktops-apps
- Microsoft Learn: Troubleshoot Remote Desktop disconnected errors: https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/troubleshoot-remote-desktop-disconnected-errors
- Microsoft Learn: New-NetFirewallRule: https://learn.microsoft.com/en-us/powershell/module/netsecurity/new-netfirewallrule
- Microsoft Learn: net user: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/net-user
- Microsoft Learn: net localgroup: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-server-2012-r2-and-2012/cc725622(v=ws.11)
- Ubuntu Manpages: xfreerdp: https://manpages.ubuntu.com/manpages/noble/man1/xfreerdp.1.html

## Issues Found
- The EC2 console path for retrieving the Windows password was outdated. Updated it to the current AWS-documented flow: select the instance, choose "Connect", open the "RDP client" tab, select the appropriate administrator username, and choose "Get password".
- The post implied the username is always "Administrator". AWS documents that the default administrator username depends on the AMI operating system language. Updated the wording to say "Administrator" applies to English AMIs.
- The macOS RDP client name was outdated. Microsoft and AWS now refer to it as "Windows App" and note that it was previously named "Microsoft Remote Desktop". Updated the macOS section accordingly.
- The certificate warning guidance said it was safe to accept the certificate. AWS documents that EC2 Windows instances use self-signed certificates, but also provides thumbprint comparison guidance. Updated the text to recommend accepting only when the user trusts the instance and to mention comparing `RDPCERTIFICATE-THUMBPRINT` for higher assurance.
- The security recommendation to change the default RDP port lacked an important caveat. AWS Fleet Manager Remote Desktop expects the Remote Desktop Services service to use the default RDP port 3389. Updated the recommendation so readers do not rely on a non-standard port alone and know to update Windows Firewall and security group rules if they change it.

## Review Notes
The remaining commands and examples were consistent with the consulted documentation: `mstsc`, `xfreerdp` options, `net user`, `net localgroup`, `New-NetFirewallRule`, and `query session` are valid for the described use cases. The instance sizing advice is subjective rather than a strict AWS requirement, but it is framed as usability guidance rather than a hard platform limit.
