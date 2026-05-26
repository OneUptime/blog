# Validation Summary: How to Use Ansible win_scheduled_task Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- community.windows.win_scheduled_task
- ansible.windows.win_file
- ansible.windows.win_copy
- Windows Task Scheduler
- PowerShell
- Mermaid

## Sources Consulted
- Ansible community.windows.win_scheduled_task module documentation: https://docs.ansible.com/projects/ansible/latest/collections/community/windows/win_scheduled_task_module.html
- Ansible ansible.windows.win_file module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_file_module.html
- Ansible ansible.windows.win_copy module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_copy_module.html
- Microsoft Learn New-ScheduledTaskAction documentation: https://learn.microsoft.com/en-us/powershell/module/scheduledtasks/new-scheduledtaskaction
- Microsoft Learn Write-EventLog documentation: https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.management/write-eventlog
- Microsoft Learn Working with WMI in PowerShell documentation: https://learn.microsoft.com/en-us/powershell/scripting/learn/ps101/07-working-with-wmi

## Issues Found
- The real-world disk cleanup script used `Get-WmiObject`, which Microsoft documents as deprecated and unavailable in PowerShell 6 and later. Changed it to `Get-CimInstance` while keeping the same WMI class and filter.
- The disk cleanup script called `Write-EventLog` with a custom source that was not guaranteed to exist. Microsoft documents that the event log source must be registered before writing. Added source registration with `New-EventLog`.
- The complete maintenance schedule referenced `archive-logs.ps1` and `check-certs.ps1` but only deployed `disk-cleanup.ps1`. Added `win_copy` tasks for the two missing scripts so the scheduled tasks point to files deployed by the playbook.

## Review Notes
The Ansible module parameters, trigger types, repetition duration examples, task folder behavior, logon types, and multiple-action ordering were consistent with official documentation. The local environment did not have `ansible-playbook`, so Ansible syntax checks could not be run; all seven YAML snippets were parsed successfully with PyYAML.
