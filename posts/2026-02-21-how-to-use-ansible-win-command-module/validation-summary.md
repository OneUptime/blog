# Validation Summary: How to Use Ansible win_command Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows.win_command
- ansible.windows.win_shell
- Windows command-line tools
- PowerShell
- Windows CIM/WMI
- WinRM

## Sources Consulted
- Ansible documentation: ansible.windows.win_command module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_command_module.html
- Ansible documentation: ansible.windows.win_shell module, https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_shell_module.html
- Ansible documentation: Setting the remote environment, https://docs.ansible.com/projects/ansible-core/2.18/playbook_guide/playbooks_environment.html
- Ansible documentation: Registering variables, https://docs.ansible.com/ansible/6/user_guide/playbooks_variables.html
- Microsoft Learn: WMIC utility, https://learn.microsoft.com/en-us/windows/win32/wmisdk/wmic
- Microsoft Learn: netstat command, https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/netstat
- Microsoft Learn: robocopy command and return codes, https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/robocopy

## Issues Found
- The post used `wmic` for disk and memory examples. Microsoft documents WMIC as deprecated as of Windows 10 version 21H1 and the 21H1 semi-annual channel release of Windows Server, superseded by PowerShell for WMI. I replaced those examples with `powershell.exe -NoProfile -Command` calls using `Get-CimInstance`, passed through `win_command` with the documented `argv` option.
- The Common Pitfalls section said shell operators cannot be used in the command, but the post also demonstrates explicitly running `cmd.exe` and now `powershell.exe`. I clarified that operators such as `|`, `>`, `<`, and `&&` are not available as shell operators unless a shell executable is explicitly invoked.
- The environment variable pitfall only mentioned `%TEMP%`, which is CMD-specific. I expanded it to include PowerShell-style `$env:TEMP` as well, matching the Ansible documentation's explanation that shell variables are not expanded by `win_command`.

## Review Notes
The `cmd /c dir` and `cmd /c del` examples are technically valid because `win_command` executes `cmd.exe` directly and `cmd.exe` then handles its built-ins. For production playbooks, native Ansible Windows modules such as `ansible.windows.win_file` are often preferable for file operations, but that is outside the scope of this `win_command` tutorial.
