# Validation Summary: How to Configure SMB Signing for IPv4 Network Security

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Samba
- SMB signing
- SMB2 and SMB3
- Windows Group Policy
- Windows PowerShell SMB cmdlets
- NTLM and Kerberos considerations

## Sources Consulted
- Samba smb.conf manual: https://www.samba.org/samba/docs/current/man-html/smb.conf.5.html
- Samba smbcontrol manual: https://www.samba.org/samba/docs/current/man-html/smbcontrol.1.html
- Samba testparm manual: https://www.samba.org/samba/docs/current/man-html/testparm.1.html
- Samba smbclient manual: https://www.samba.org/samba/docs/current/man-html/smbclient.1.html
- Samba smbstatus manual: https://www.samba.org/samba/docs/current/man-html/smbstatus.1.html
- Microsoft Control SMB signing behavior: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing
- Microsoft Overview of SMB signing: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-signing-overview
- Microsoft SMB security enhancements: https://learn.microsoft.com/en-us/windows-server/storage/file-server/smb-security
- Microsoft Set-SmbClientConfiguration cmdlet: https://learn.microsoft.com/en-us/powershell/module/smbshare/set-smbclientconfiguration
- Microsoft Set-SmbServerConfiguration cmdlet: https://learn.microsoft.com/en-us/powershell/module/smbshare/set-smbserverconfiguration
- GitHub author profile: https://github.com/nawazdhandala

## Issues Found

1. **Incorrect Samba client signing value**: Changed `client signing = mandatory` to `client signing = required`, which matches the current Samba `client signing` documented values.

2. **Overgeneralized SMB signing option descriptions**: Updated the signing options table and acceptable values list to distinguish current Samba server values from current Samba client values.

3. **Missing SMB2/3 signing caveat for Samba**: Added the Samba-documented behavior that `server signing = disabled` is treated as `auto` for SMB2 because SMB2 signing cannot be disabled by design.

4. **Distribution-specific reload command**: Replaced `systemctl reload smb` with `smbcontrol smbd reload-config`, which is Samba's documented way to request a configuration reload from `smbd`.

5. **Outdated smbclient verification output**: Removed the old SMB1 `Session Setup AndX` output example and replaced it with `smbclient --client-protection=sign` plus `smbstatus --json`, matching current Samba tooling.

6. **Windows SMB2+ policy behavior**: Removed the "if client/server agrees" settings as required steps and noted that those `EnableSecuritySignature` policies only affect SMB1; SMB2+ signing is controlled by `RequireSecuritySignature`.

7. **Non-preferred Windows registry commands**: Replaced direct registry edits with the current Microsoft SMB PowerShell cmdlets, `Set-SmbServerConfiguration` and `Set-SmbClientConfiguration`.

8. **Unsupported fixed performance estimate**: Removed the specific `5-15%` CPU overhead claim because official documentation does not give a universal percentage; performance impact is workload-dependent.

9. **Signing algorithm precision**: Clarified that SMB 3.0/3.02 use AES-CMAC instead of SMB 2.0 HMAC-SHA256, and that SMB 3.1.1 peers may negotiate newer algorithms such as AES-128-GMAC.

10. **NTLM relay wording**: Changed the key takeaway from an absolute prevention claim to a more precise statement that signing helps prevent SMB relay and spoofing on signed sessions, and added the Kerberos/hostname caveat for IP-based connections.

## Review Notes
- The post is technically relevant and contains concrete implementation details, so it was reviewed as a tutorial.
- `server signing = mandatory` is the correct Samba setting to require signed inbound SMB sessions.
- The Windows `RequireSecuritySignature` registry-backed setting is still the relevant policy value, but the SMB PowerShell cmdlets are the current documented configuration method.
