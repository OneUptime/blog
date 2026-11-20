# Validation summary

Reviewed DACL, ownership, SACL, inheritance, file timestamps and share permissions as separate acceptance concerns. The article distinguishes preserved SACLs from working audit policy and limits icacls save/verify claims.

## Checks performed

Three published PowerShell snippets parsed with PowerShell 7.4.6 and match extracted checked files. Eleven synthetic-record comparison cases passed: equal JSON-imported records, row order changes, each of seven metadata-field changes, and missing/extra records. Tests validate comparison behavior only, not Windows security-descriptor acquisition. The social image was generated and visually inspected; the title fits.

## Limits

No Windows or NTFS runtime was available. Robocopy, Get-Acl, privilege configuration, actual preservation and audit delivery were not executed. The sample compares a selected set of trusted fixture paths and does not establish full-tree or file-content equivalence. Raw SDDL differences remain review items rather than automatic repair instructions.

## Checked sources

- https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists
- https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges
- https://learn.microsoft.com/en-us/windows/win32/secauthz/sacl-access-right
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/robocopy
- https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-acl?view=powershell-7.4
- https://learn.microsoft.com/en-us/windows/win32/sysinfo/file-times
- https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/compare-object?view=powershell-7.4
- https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls
- https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/audit-file-system

## Repository checks

The repository validator passed for this post in an isolated fixture with its catalog entry, author list, tag allowlist, and social image. Shell examples, if present, passed bash syntax checking. The full existing catalog was not revalidated.
