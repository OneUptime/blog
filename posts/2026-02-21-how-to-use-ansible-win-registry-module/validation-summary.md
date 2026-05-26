# Validation Summary: How to Use Ansible win_registry Module

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows collection
- Windows Registry
- Windows security hardening registry settings
- Remote Desktop Services registry settings

## Sources Consulted
- Ansible `ansible.windows.win_regedit` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_regedit_module.html
- Ansible `ansible.windows.win_reg_stat` module documentation: https://docs.ansible.com/projects/ansible/latest/collections/ansible/windows/win_reg_stat_module.html
- Microsoft Learn, Detect, enable, and disable SMBv1, SMBv2, and SMBv3 in Windows: https://learn.microsoft.com/en-us/windows-server/storage/file-server/troubleshoot/detect-enable-and-disable-smbv1-v2-v3
- Microsoft Learn, Windows Firewall policy settings and baseline registry values: https://learn.microsoft.com/en-us/azure/osconfig/server2025machineconfigdoc
- Microsoft Learn, Troubleshoot unexpected RDS session locks or disconnections: https://learn.microsoft.com/en-us/troubleshoot/windows-server/remote/troubleshoot-unexpected-rds-session-locks-or-disconnections
- Microsoft Learn, Troubleshoot authentication errors when you use RDP to connect to Azure VM: https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/cannot-connect-rdp-azure-vm

## Issues Found
- The post title and summary referred to an Ansible `win_registry` module, but the documented module for adding, changing, or removing registry keys and values is `ansible.windows.win_regedit`. Updated the title and summary wording to use `win_regedit`.
- The SMBv1 client hardening example disabled the `mrxsmb10` driver but did not remove the `MRxSmb10` dependency from `LanmanWorkstation`, which Microsoft documents as part of disabling the SMBv1 client. Added a `DependOnService` `multistring` registry task with `Bowser`, `MRxSmb20`, and `NSI`.
- The firewall logging example set the log path and size but did not enable logging of dropped packets or successful connections. Added `LogDroppedPackets` and `LogSuccessfulConnections` `REG_DWORD` values set to `1`.
- Corrected the tag `Window` to `Windows`.

## Review Notes
The Ansible examples use the current fully qualified collection names and valid `win_regedit`/`win_reg_stat` parameters. Some Windows registry changes, including SMBv1 changes and RDP service configuration changes, may require a service restart, policy refresh, or system reboot before taking effect.
