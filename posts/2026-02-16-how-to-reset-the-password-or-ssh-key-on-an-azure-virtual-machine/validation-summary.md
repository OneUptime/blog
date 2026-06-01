# Validation Summary: How to Reset the Password or SSH Key on an Azure Virtual Machine

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Azure Virtual Machines
- Azure CLI
- VMAccessForLinux extension
- VMAccessAgent extension for Windows
- SSH keys and password authentication
- Azure Serial Console
- Azure VM repair

## Sources Consulted
- Microsoft Learn: Reset access to an Azure Linux VM - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/vmaccess-linux
- Microsoft Learn: Azure CLI `az vm user` reference - https://learn.microsoft.com/en-us/cli/azure/vm/user
- Microsoft Learn: Reset access to an Azure Windows VM - https://learn.microsoft.com/en-us/azure/virtual-machines/extensions/vmaccess-windows
- Microsoft Learn: Azure Serial Console for Linux - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/serial-console-linux
- Microsoft Learn: Reset local Linux password on Azure VMs - https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/linux/reset-password
- Microsoft Learn: Azure CLI `az vm repair` reference - https://learn.microsoft.com/en-us/cli/azure/vm/repair
- Microsoft Learn: Windows VM FAQ password requirements - https://learn.microsoft.com/en-us/azure/virtual-machines/windows/faq
- Microsoft Learn: Windows password complexity policy - https://learn.microsoft.com/en-us/windows/security/threat-protection/security-policy-settings/password-must-meet-complexity-requirements

## Issues Found
- The post said `az vm user update --ssh-key-value` replaces the user's authorized SSH key. Microsoft documents that this command appends the public key to `~/.ssh/authorized_keys` and does not remove existing keys, so the explanation was corrected.
- The post implied `az vm user reset-ssh` enables password authentication when it was disabled. Microsoft documents that it restarts SSH, opens the SSH port, resets SSH configuration, and does not change user accounts, passwords, or keys, so the note was corrected and now tells readers to check `PasswordAuthentication` if password login still fails.
- The Windows password requirements were too strict and incomplete. Azure CLI requires 12 to 123 characters and at least three of four complexity categories; the Windows account-name/full-name restriction applies when Windows password complexity policy is enabled.
- The direct Windows VMAccess extension example used version `2.4` and mixed-case JSON field names. The Microsoft Learn VMAccessAgent CLI example uses version `2.0` with lowercase `username` and `password`, so the example was updated.
- The recovery VM workflow deleted and recreated the original VM and depended on the original OS disk being retained. Microsoft now documents `az vm repair create` and `az vm repair restore` for this workflow, so the recovery commands were updated to use the supported repair flow.
- The offline SSH-key repair commands overwrote `authorized_keys` and used a hard-coded UID/GID. The commands now append the key, set SSH file permissions, and use `chroot` to apply ownership by username.

## Review Notes
The Azure CLI was not installed in the local environment, so CLI syntax was verified against current Microsoft Learn command references instead of local `az --help` output.
