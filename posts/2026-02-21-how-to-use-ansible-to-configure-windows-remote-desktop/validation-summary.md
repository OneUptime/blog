# Validation Summary: How to Use Ansible to Configure Windows Remote Desktop

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows collection
- community.windows collection
- Windows Remote Desktop Services
- Remote Desktop Protocol (RDP)
- Windows Registry
- Windows Firewall

## Sources Consulted
- Ansible `ansible.windows.win_regedit` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_regedit_module.html
- Ansible `community.windows.win_firewall_rule` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_firewall_rule_module.html
- Ansible `ansible.windows.win_group_membership` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_group_membership_module.html
- Ansible `ansible.windows.win_service` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_service_module.html
- Ansible `ansible.windows.win_reboot` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_reboot_module.html
- Microsoft Learn, Change the Remote Desktop listening port: https://learn.microsoft.com/en-us/windows-server/remote/remote-desktop-services/remotepc/change-listening-port
- Microsoft Learn, `SecurityLayer` unattended setting: https://learn.microsoft.com/en-us/windows-hardware/customize/desktop/unattend/microsoft-windows-terminalservices-rdp-winstationextensions-securitylayer
- Microsoft Learn, `UserAuthentication` unattended setting: https://learn.microsoft.com/en-us/windows-hardware/customize/desktop/unattend/microsoft-windows-terminalservices-rdp-winstationextensions-userauthentication
- Microsoft Learn, Troubleshoot unexpected RDS session locks or disconnections: https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/troubleshoot-unexpected-rds-session-locks-or-disconnections
- Microsoft Learn, ADMX TerminalServer Policy CSP: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-admx-terminalserver
- Microsoft Learn, RemoteDesktopServices Policy CSP: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-remotedesktopservices
- Microsoft Learn, How to temporarily disable Terminal Server Client Logons: https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/disable-terminal-server-client-logons

## Issues Found
- The custom RDP port example only created a TCP firewall rule. Microsoft documents creating both TCP and UDP firewall rules for a changed Remote Desktop port, so a UDP rule was added and the default UDP rule is removed with the default TCP rule.
- The custom RDP port example restarted `TermService` to apply the new port. Microsoft documents restarting the computer after changing the registry port, and Microsoft also notes that Terminal Server service cannot be paused, stopped, or disabled in normal RDS operation. The task now uses `ansible.windows.win_reboot`.
- The Managing RDP Access section described `fPromptForPassword` as an access restriction. That registry value maps to the "Always prompt for password upon connection" policy, so the task name and surrounding explanation were corrected.
- The complete hardening playbook allowed only TCP 3389 through Windows Firewall. A matching UDP firewall rule was added for RDP.
- The disable-RDP playbook attempted to stop and disable `TermService`. That task was removed, leaving RDP disabled through `fDenyTSConnections` and blocked at the firewall.
- The disable-RDP playbook blocked only TCP 3389. A UDP block rule was added for completeness.

## Review Notes
The playbooks use current fully qualified Ansible collection module names. The examples are registry-policy based and may be overridden by domain Group Policy in managed environments.
