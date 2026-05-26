# Validation Summary: How to Fix Ansible WinRM connection failed Errors

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Ansible
- WinRM
- Windows PowerShell
- pywinrm
- Ansible Windows modules and community.windows modules

## Sources Consulted
- Ansible Windows Remote Management documentation: https://docs.ansible.com/projects/ansible/latest/os_guide/windows_winrm.html
- Ansible Managing Windows hosts documentation: https://docs.ansible.com/projects/ansible/latest/os_guide/intro_windows.html
- Ansible winrm connection plugin documentation: https://docs.ansible.com/projects/ansible/2.10/collections/ansible/builtin/winrm_connection.html
- Ansible ConfigureRemotingForAnsible.ps1 script source: https://raw.githubusercontent.com/ansible/ansible-documentation/devel/examples/scripts/ConfigureRemotingForAnsible.ps1
- ansible.windows.win_ping documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_ping_module.html
- ansible.windows.win_feature documentation: https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_feature_module.html
- ansible.windows.win_timezone documentation: https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_timezone_module.html
- ansible.windows.win_hostname documentation: https://docs.ansible.com/ansible/2.10/collections/ansible/windows/win_hostname_module.html
- ansible.windows.win_template documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_template_module.html
- ansible.windows.win_copy documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_copy_module.html
- ansible.windows.win_command documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_command_module.html
- community.windows.win_firewall_rule documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_firewall_rule_module.html
- community.windows.win_scheduled_task documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_scheduled_task_module.html
- Microsoft WinRM installation and configuration documentation: https://learn.microsoft.com/en-us/windows/win32/winrm/installation-and-configuration-for-windows-remote-management
- Microsoft WinRM HTTPS configuration documentation: https://learn.microsoft.com/en-us/troubleshoot/windows-client/system-management-components/configure-winrm-for-https
- Microsoft New-NetFirewallRule documentation: https://learn.microsoft.com/powershell/module/netsecurity/new-netfirewallrule

## Issues Found
- The post said Windows WinRM configuration does not come enabled by default. Current Ansible docs note WinRM is enabled by default on Windows Server 2012 and newer, but extra configuration is often required. Updated the wording.
- The WinRM setup example described `winrm quickconfig -force` as enabling an HTTPS listener, which is inaccurate. Replaced it with `Enable-PSRemoting -Force` for the default HTTP listener and clarified that the setup script is for lab/development HTTPS setup.
- The ConfigureRemotingForAnsible.ps1 URL pointed to the old ansible/ansible repository path, which now returns 404. Updated it to the ansible-documentation repository path.
- The pywinrm installation commands did not pin the documented minimum version and did not quote extras. Updated them to `pip3 install "pywinrm>=0.4.0"` and `pip3 install "pywinrm[kerberos]>=0.4.0"`.
- The listener check section used `winrm get winrm/config/service` under a comment about verifying an HTTPS listener. Updated the comment to accurately describe service authentication and encryption settings.
- The firewall command omitted explicit inbound direction and profile scope. Added `-Direction Inbound -Profile Any`.
- The HTTP testing example used Basic authentication over HTTP with unencrypted traffic as the primary example. Updated it to use NTLM with `ansible_winrm_message_encryption=always` and left Basic over HTTP as a last-resort development-only option.
- The summary implied the ConfigureRemotingForAnsible.ps1 script was generally appropriate for production use. Clarified that it is suitable for lab and development environments.
- The common use case playbooks used Linux/POSIX modules such as `package`, `timezone`, `hostname`, `lineinfile`, `ufw`, `cron`, and shell scripts in a Windows WinRM article. Reworked those snippets to use Windows-appropriate Ansible modules and `community.windows` modules.
- The firewall playbook used `proto`, which is not the current `community.windows.win_firewall_rule` parameter name. Updated it to `protocol`.

## Review Notes
The inventory example uses `ansible_winrm_server_cert_validation=ignore`, which is valid for self-signed certificates but should be replaced with CA trust validation in production. The post now keeps that example as a troubleshooting pattern, not as a production security recommendation.
