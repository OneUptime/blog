# Validation Summary: How to Use Ansible to Manage Windows Power Settings

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible playbooks
- `ansible.windows.win_shell`
- Windows PowerShell
- Windows `powercfg`
- Windows power plans and power setting GUIDs

## Sources Consulted
- Microsoft Learn: Powercfg command-line options - https://learn.microsoft.com/en-us/windows-hardware/design/device-experiences/powercfg-command-line-options
- Microsoft Learn: Sleep settings overview - https://learn.microsoft.com/en-us/windows-hardware/customize/power-settings/sleep-settings
- Microsoft Learn: Hybrid sleep - https://learn.microsoft.com/en-us/windows-hardware/customize/power-settings/sleep-settings-hybrid-sleep
- Microsoft Learn: Automatically wake for tasks - https://learn.microsoft.com/en-us/windows-hardware/customize/power-settings/sleep-settings-automatically-wake-for-tasks
- Microsoft Learn: PCI Express settings overview - https://learn.microsoft.com/en-us/windows-hardware/customize/power-settings/pci-express-settings
- Microsoft Learn: Link state power management - https://learn.microsoft.com/en-us/windows-hardware/customize/power-settings/pci-express-settings-link-state-power-management
- Microsoft Learn: Disk settings overview - https://learn.microsoft.com/en-us/windows-hardware/customize/power-settings/disk-settings
- Microsoft Learn: USB selective suspend - https://learn.microsoft.com/en-us/windows-hardware/drivers/usbcon/usb-selective-suspend
- Ansible documentation: `ansible.windows.win_shell` - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_shell_module.html
- Ansible documentation: `ansible.windows.win_regedit` - https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_regedit_module.html

## Issues Found
- The wake timer task used `ansible.windows.win_regedit` with a registry path that omitted the Sleep settings subgroup GUID, and it used `ACSettingIndex: 1`, which enables wake timers rather than setting them to important-only. Replaced the registry edit with `powercfg /setacvalueindex` and `powercfg /setdcvalueindex` against the documented Sleep subgroup and RTCWAKE setting GUIDs, using index `2` for important-only.
- The complete playbook redirected `powercfg /query` to `C:\Temp\power-config.txt` without ensuring `C:\Temp` exists. Added `New-Item -ItemType Directory -Path C:\Temp -Force | Out-Null` before writing the report.
- The battery-backed server note implied any rack-mounted battery backup unit makes Windows use DC power settings. Clarified that DC settings apply when Windows sees the system as running on battery, such as with UPS-managed or battery-backed systems exposed to the OS.

## Review Notes
The `powercfg` commands and Ansible module usage are valid, but the examples are command-based and therefore not fully idempotent from Ansible's perspective: tasks that use `win_shell` may report changed even when settings already match. A future improvement would be to add explicit checks or `changed_when` conditions.
