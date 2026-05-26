# Validation Summary: How to Use Ansible win_shell Module

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ansible
- ansible.windows.win_shell
- ansible.windows.win_command
- ansible.windows.win_file
- Windows PowerShell
- cmd.exe
- Robocopy

## Sources Consulted
- Ansible documentation: ansible.windows.win_shell module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_shell_module.html
- Ansible documentation: ansible.windows.win_command module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_command_module.html
- Ansible documentation: ansible.windows.win_file module - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_file_module.html
- Ansible documentation: setting the remote environment - https://docs.ansible.com/projects/ansible-core/2.18/playbook_guide/playbooks_environment.html
- Microsoft Learn: Robocopy command and return codes - https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/robocopy
- Microsoft Learn: Compress-Archive PowerShell cmdlet - https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.archive/compress-archive

## Issues Found
- The Robocopy example did not account for Robocopy's documented return-code behavior, where return codes 1 through 7 can indicate successful or non-fatal outcomes. Added `register: robocopy_result` and `failed_when: robocopy_result.rc >= 8` so Ansible only treats documented failure codes as failures.
- The PowerShell 7 example implied a specific PowerShell version without noting that `pwsh.exe` must be available on the target host's `PATH` when an absolute executable path is not supplied. Updated the comment to make that condition explicit.

## Review Notes
The main `win_shell` versus `win_command` explanation, use of `creates` and `removes`, default PowerShell behavior, `executable` behavior, task-level `environment`, and `Compress-Archive` usage align with current official documentation. For more structured PowerShell object output, Ansible's `ansible.windows.win_powershell` module may be a better fit in future examples, but the current examples are valid for shell-oriented command execution.
