# Preserve NTFS Permissions, Owners, Audit Rules, and Migration Timestamps

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: File Permissions, Windows Server, Data Migration

Description: Verify NTFS security and timestamps independently during file-share migration, including audit access, inheritance, and destination permission tests.

A migrated folder can contain every expected byte and still be wrong. A finance document might inherit broader access from its new parent. Its owner might become the migration account. Audit rules might disappear even though users can open the file.

Treat metadata as migration data with its own acceptance criteria. This walkthrough focuses on NTFS-to-NTFS copies in the same Active Directory domain, using Windows Server 2022 and PowerShell 7.4 syntax. It provides a small evidence collection example and a repeatable comparison process. It does not cover cross-domain account translation or claim that a copy switch preserves every possible file-system feature.

## Name the metadata you must preserve

An access control list, or ACL, contains individual access control entries, called ACEs. Windows distinguishes the discretionary ACL, which controls access, from the system ACL, which includes audit rules. Microsoft's [ACL documentation](https://learn.microsoft.com/en-us/windows/win32/secauthz/access-control-lists) explains the distinction.

| Metadata | What to verify | Common false assurance |
| --- | --- | --- |
| DACL | Allowed and denied rights, inherited entries, protection from inheritance | An administrator can open the file |
| Owner | The intended security identifier remains the owner | The copy account owns everything, but access works |
| SACL | Required audit entries and inheritance survive | No error was printed during copying |
| Creation and last-write times | File and directory values match the agreed policy | Only file sizes were compared |
| Share permissions | SMB access restrictions remain appropriate | NTFS security alone was copied |

A security identifier, or SID, identifies an account or group. Display names are convenient for people, but use the underlying security descriptor for migration evidence. A familiar name does not establish that two accounts have the same identity.

Separate intentional changes from preservation. For example, changing an obsolete owner should be a recorded remediation, not an unexplained side effect of copying. Inventory local-server accounts too: joining both servers to the same domain does not make their local account SIDs identical.

## Prove the account can read the evidence

Permissions on a file and privileges held by a process are different. Windows checks both whether a required privilege exists and whether it is enabled; privileges can differ between computers for the same domain account. See Microsoft's [privilege model](https://learn.microsoft.com/en-us/windows/win32/secauthz/privileges).

Reading or writing a SACL requires the security privilege described in [SACL access rights](https://learn.microsoft.com/en-us/windows/win32/secauthz/sacl-access-right). Test the migration and verification identities against a known audited file before processing the tree. If the expected audit entry cannot be read, stop and correct the account configuration. An inaccessible SACL must not become an empty baseline.

Use representative fixtures: a protected folder, inherited permissions, an explicit deny, a nondefault owner, an audited document, an empty directory, and a file whose bytes remain unchanged between copy passes. The unchanged file reveals whether later metadata-only changes are being missed.

Keep baseline exports in restricted storage outside the migrating tree. They expose account identifiers, paths, and security policy even when they contain no file contents.

## Choose copy behavior explicitly

For a dedicated staging target, the following is a preview only. Replace both paths and the private log filename; the log's parent directory must already exist. Run on Windows with the required source-read and destination-restore rights.

```powershell
robocopy.exe '\\old-fs.example.com\Finance' '\\new-fs.example.com\FinanceStage' `
    /E /COPYALL /DCOPY:DAT /SECFIX /TIMFIX /XJ /R:2 /W:3 `
    /L /UNILOG:C:\MigrationLogs\metadata-preview.log
$CopyExitCode = $LASTEXITCODE
if ($CopyExitCode -ge 8) { throw "Robocopy failed: $CopyExitCode" }
```

`/COPYALL` means data, attributes, timestamps, security, owner, and auditing information for files. `/SEC` alone does not request that entire set. `/DCOPY:DAT` includes directory timestamps; `/SECFIX` and `/TIMFIX` revisit skipped files. `/XJ` excludes junctions. `/L` performs a listing, not the actual copy. Review the log and approved paths before removing it for a real migration. Return codes below eight still need review. These meanings come from the [Robocopy reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/robocopy).

This configuration does not promise preservation of directory extended attributes, hard-link relationships, encrypted-file keys, or excluded junctions. Inventory those separately. It also does not create SMB share permissions. Do not silently broaden the acceptance claim from “requested metadata copied” to “everything preserved.”

## Capture a small, inspectable baseline

First freeze changes to the selected fixture paths. Use the same reviewed relative-path list on both sides. The example assumes ordinary files and directories with no reparse points in their paths; it is not a recursive inventory or an untrusted-path handler.

Run this in PowerShell on Windows. Substitute your root and fixture names. Include the root itself as `.` so its inheritance boundary is examined.

```powershell
$ErrorActionPreference = 'Stop'
$Root = '\\old-fs.example.com\Finance'
$RelativePaths = @('.', 'Restricted', 'Restricted\audit-fixture.txt')

$Evidence = @(
    foreach ($Relative in $RelativePaths) {
        $Path = Join-Path $Root $Relative
        $Item = Get-Item -LiteralPath $Path -Force
        $Acl = Get-Acl -LiteralPath $Path -Audit
        [pscustomobject]@{
            RelativePath = $Relative
            IsDirectory = $Item.PSIsContainer
            Sddl = $Acl.Sddl
            AccessProtected = $Acl.AreAccessRulesProtected
            AuditProtected = $Acl.AreAuditRulesProtected
            CreationUtc = $Item.CreationTimeUtc.ToString('o')
            LastWriteUtc = $Item.LastWriteTimeUtc.ToString('o')
        }
    }
)
$Evidence | ConvertTo-Json -Depth 4 |
    Out-File -LiteralPath 'C:\MigrationLogs\source-metadata.json' -Encoding utf8 -NoClobber
```

[Get-Acl with `-Audit`](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.security/get-acl?view=powershell-7.4) retrieves audit data as well as the security descriptor. SDDL is its textual representation. The script stops on access errors and refuses to overwrite an existing export. For the destination, change `$Root` and the output filename to `destination-metadata.json`.

Capture directory times after the final child copies finish. Compare UTC values, not localized displays. NTFS stores timestamps in UTC, and write timestamps are not fully settled until writing handles close. Last-access updates have different timing, so this example does not use last-access time as an equality gate. If retention policy requires it, define and test a separate preservation procedure. See [Windows file times](https://learn.microsoft.com/en-us/windows/win32/sysinfo/file-times).

## Compare evidence and investigate differences

With both nonempty exports available, run:

```powershell
$SourceEvidence = @(Get-Content -LiteralPath 'C:\MigrationLogs\source-metadata.json' -Raw | ConvertFrom-Json)
$TargetEvidence = @(Get-Content -LiteralPath 'C:\MigrationLogs\destination-metadata.json' -Raw | ConvertFrom-Json)
$Fields = @('RelativePath', 'IsDirectory', 'Sddl', 'AccessProtected',
            'AuditProtected', 'CreationUtc', 'LastWriteUtc')
Compare-Object -ReferenceObject $SourceEvidence -DifferenceObject $TargetEvidence `
    -Property $Fields -CaseSensitive
```

[Compare-Object](https://learn.microsoft.com/en-us/powershell/module/microsoft.powershell.utility/compare-object?view=powershell-7.4) marks source-only values with `<=` and destination-only values with `=>`. No output means the selected records match on these fields. It says nothing about files outside the list or their contents.

Treat a different SDDL string as a review item, not permission to rewrite the destination automatically. Equivalent representations or an approved inheritance change may need interpretation. Confirm expected owner SIDs, ACE order, inheritance flags, and audit entries. Avoid sorting ACEs arbitrarily: access evaluation depends on their order.

The commonly used `icacls /save` stores DACLs for restoration. It is not a complete owner, SACL, timestamp, and data backup. Likewise, `icacls /verify` checks ACL structure rather than proving migration equivalence. See the [icacls reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/icacls).

## Verify behavior before opening the share

A preserved SACL is only part of functioning auditing. The destination also needs the appropriate audit policy, and the tested action and identity must match the rule. Microsoft's [Audit File System documentation](https://learn.microsoft.com/en-us/previous-versions/windows/it-pro/windows-10/security/threat-protection/auditing/audit-file-system) describes that relationship.

Test permitted and denied actions as representative ordinary users, not just an administrator. Verify the expected audit event reaches the intended log or collector. Exercise a newly created child in a designated test folder to confirm inheritance, then account for the resulting timestamp changes separately.

For a full migration, expand evidence collection to the required coverage and reconcile every failure or exclusion. Approve cutover only after content checks, metadata checks, share-access tests, and audit-delivery checks pass independently. That separation makes a missing audit rule visible instead of letting a successful file copy hide it.
