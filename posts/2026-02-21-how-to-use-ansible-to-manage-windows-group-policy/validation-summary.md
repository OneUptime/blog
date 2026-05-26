# Validation Summary: How to Use Ansible to Manage Windows Group Policy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ansible
- ansible.windows collection
- community.windows collection
- Windows Group Policy
- Active Directory Group Policy Objects
- Windows registry policy settings
- PowerShell GroupPolicy module
- Windows command-line tools: secedit, gpupdate, gpresult

## Sources Consulted
- Ansible `ansible.windows.win_regedit` module documentation: https://docs.ansible.com/ansible/latest/collections/ansible/windows/win_regedit_module.html
- Ansible `community.windows.win_security_policy` module documentation: https://docs.ansible.com/ansible/latest/collections/community/windows/win_security_policy_module.html
- Microsoft Group Policy processing documentation: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-policy/group-policy-processing
- Microsoft Group Policy Management Console documentation: https://learn.microsoft.com/en-us/windows-server/identity/ad-ds/manage/group-policy/group-policy-management-console
- Microsoft PowerShell GroupPolicy module documentation: https://learn.microsoft.com/en-us/powershell/module/grouppolicy/
- Microsoft `Get-GPO` documentation: https://learn.microsoft.com/en-us/powershell/module/grouppolicy/get-gpo
- Microsoft `New-GPO` documentation: https://learn.microsoft.com/en-us/powershell/module/grouppolicy/new-gpo
- Microsoft `Set-GPRegistryValue` documentation: https://learn.microsoft.com/en-us/powershell/module/grouppolicy/set-gpregistryvalue
- Microsoft `New-GPLink` documentation: https://learn.microsoft.com/en-us/powershell/module/grouppolicy/new-gplink
- Microsoft `Get-GPInheritance` documentation: https://learn.microsoft.com/en-us/powershell/module/grouppolicy/get-gpinheritance
- Microsoft `secedit /export` documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/secedit-export
- Microsoft `gpupdate` documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/gpupdate
- Microsoft `gpresult` documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/gpresult
- Microsoft Windows Installer `AlwaysInstallElevated` documentation: https://learn.microsoft.com/en-us/windows/win32/msi/alwaysinstallelevated
- Microsoft Windows Update restart policy registry documentation: https://learn.microsoft.com/en-us/windows/deployment/update/waas-restart
- Microsoft AuditSettings Policy CSP documentation for `ProcessCreationIncludeCmdLine_Enabled`: https://learn.microsoft.com/en-us/windows/client-management/mdm/policy-csp-admx-auditsettings
- Microsoft SMB signing overview: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview
- Microsoft USB storage prevention guidance: https://learn.microsoft.com/en-us/troubleshoot/windows-client/setup-upgrade-and-drivers/prevent-users-connect-usb
- Microsoft security policy documentation for anonymous SAM enumeration: https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/security-policy-settings/network-access-do-not-allow-anonymous-enumeration-of-sam-accounts
- Microsoft User Account Control settings documentation: https://learn.microsoft.com/en-us/windows/security/application-security/application-control/user-account-control/settings-and-configuration

## Issues Found
- Corrected the tag `Window` to `Windows`.
- Clarified Group Policy processing so the post says domain-linked GPOs are processed after local policy and can override conflicting local settings, instead of stating an unconditional override.
- Added an `HKCU` caveat for Ansible registry edits because `HKCU` targets the currently loaded profile for the connection user, not every user profile on the machine.
- Added `ScreenSaveActive` to the screen saver registry example so the password-protection and timeout values are paired with the policy value that enables the screen saver.
- Replaced the invalid `EnableGuestAccount` registry-based GPO example with the documented `EnableLUA` UAC policy value.
- Replaced the nonexistent `Get-GPLink` PowerShell cmdlet with `Get-GPInheritance` and a `GpoLinks` check before calling `New-GPLink`.
- Updated the process creation audit comment to say it includes command-line data in process creation audit events, because that registry value does not enable Audit Process Creation by itself.
- Changed `C:\Temp` output paths to `C:\Windows\Temp` in examples so `secedit` and `gpresult` do not depend on a custom directory existing.

## Review Notes
The examples are technically valid as tutorial snippets, but production use should still account for privilege requirements, reboot requirements for some security settings, domain policy precedence, and idempotence/reporting around `win_shell` tasks.
