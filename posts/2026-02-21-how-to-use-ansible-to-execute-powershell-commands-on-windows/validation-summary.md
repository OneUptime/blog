# Validation Summary: How to Use Ansible to Execute PowerShell Commands on Windows

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows collection
- PowerShell
- Windows Remote Management (WinRM)
- Windows services
- Windows Server features and roles
- Windows registry

## Sources Consulted
- Ansible Community Documentation: ansible.windows.win_shell module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_shell_module.html
- Ansible Community Documentation: ansible.windows.win_command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_command_module.html
- Ansible Community Documentation: Using Ansible and Windows - https://docs.ansible.com/projects/ansible/latest/os_guide/windows_usage.html
- Ansible Documentation: Setting up a Windows Host - https://docs.ansible.com/projects/ansible/8/os_guide/windows_setup.html
- Ansible Documentation: Windows Remote Management - https://docs.ansible.com/projects/ansible/3/user_guide/windows_winrm.html
- Microsoft Learn: Installation and configuration for Windows Remote Management - https://learn.microsoft.com/en-us/windows/win32/winrm/installation-and-configuration-for-windows-remote-management

## Issues Found
- The WinRM setup commands enabled `AllowUnencrypted` and Basic authentication, while the inventory used NTLM over HTTPS on port 5986. This was misleading and incomplete because port 5986 requires an HTTPS listener and certificate, and Ansible/Microsoft documentation warns against allowing unencrypted traffic except for troubleshooting. I replaced the setup snippet with Ansible's documented `ConfigureRemotingForAnsible.ps1` workflow, which creates a self-signed certificate and HTTPS listener suitable for the inventory shown.
- The original Ansible script location has moved out of the `ansible/ansible` repository. I used the current reachable URL from the `ansible/ansible-documentation` repository for `ConfigureRemotingForAnsible.ps1`.

## Review Notes
- The examples correctly distinguish `ansible.windows.win_shell` from `ansible.windows.win_command`: `win_shell` runs through a shell that defaults to PowerShell, while `win_command` executes commands outside a shell and does not process shell operators such as pipes.
- Several examples use raw PowerShell for tasks that also have dedicated Ansible Windows modules, such as services, registry, files, and Windows features. This is technically valid for a PowerShell-focused tutorial, but production playbooks should prefer dedicated modules when they provide the needed behavior and idempotency.
