# Migrate an SMB File Share with a Short, Controlled Write Freeze

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: SMB, File Storage, Data Migration

Description: Pre-seed an SMB migration, reconcile changes, freeze writers, and validate file access and server identity before reopening the destination.

“Zero downtime” is a useful ambition, but an ordinary file copy followed by a DNS change cannot guarantee uninterrupted writes. Existing clients have open files, applications may buffer data, and two writable copies can diverge. A safer plan keeps the source available during bulk copying, then uses a measured write freeze to establish one authoritative destination.

This walkthrough targets ordinary NTFS file shares on domain-joined Windows Server 2022 systems in the same Active Directory domain. SMB means Server Message Block, the protocol clients use to access the share. Clustered file services, live databases, encrypted-file migrations, and cross-domain identity translation require their own migration procedures.

## Define the cutover contract

Agree on the client path, permitted interruption, verification gates, and rollback boundary. Identify service accounts, scheduled tasks, interactive users, and processes running locally on the source server. A share that looks quiet during office hours may have overnight writers.

Record source and destination capacity, file counts, permissions, share settings, special file types, and application ownership. Confirm that the destination supports the source's required features. Test long paths and application-specific files early instead of discovering incompatibilities during the freeze.

Keep the destination unavailable to ordinary writers during synchronization. Only the migration identity and designated validators should access it. Maintain a recoverable source backup independently of the migration copy.

```mermaid
flowchart LR
    A[Source accepts normal writes] --> B[Pre-seed destination]
    B --> C[Repeat delta copies]
    C --> D[Freeze and drain source writers]
    D --> E[Final sync and reconciliation]
    E --> F[Move supported server identity and DNS]
    F --> G[Controlled client validation]
    G --> H[Enable destination writers only]
```

Estimate the freeze from a rehearsal: draining applications, scanning directories, copying the remaining changes, validating, and reconnecting clients all consume time. A small byte delta can still require a long directory scan.

## Pre-seed a dedicated destination

Use an elevated Windows PowerShell session with access to both paths. Replace the example server and share names. The migration account needs the rights required to copy owner and auditing information; administrative membership alone is not a verification of those privileges. Create a private log directory outside both trees first.

This example starts in preview mode. It creates a unique log but does not copy file data until `$PreviewOnly` is explicitly changed to `$false` after review.

```powershell
$ErrorActionPreference = 'Stop'
$Source = '\\old-fs.example.com\Finance'
$Destination = '\\new-fs.example.com\FinanceStage'
$LogDirectory = 'C:\MigrationLogs'
$PreviewOnly = $true

if (-not (Test-Path -LiteralPath $LogDirectory -PathType Container)) {
    throw 'Create the private migration log directory first.'
}
$Log = Join-Path $LogDirectory (([guid]::NewGuid().ToString()) + '.log')
$Options = @('/E', '/COPYALL', '/DCOPY:DAT', '/SECFIX', '/TIMFIX',
             '/XJ', '/Z', '/R:2', '/W:3', '/TEE', "/UNILOG:$Log")
if ($PreviewOnly) { $Options += '/L' }

& robocopy.exe $Source $Destination @Options
$CopyExitCode = $LASTEXITCODE
if ($CopyExitCode -ge 8) {
    throw "Copy failed with exit code $CopyExitCode; inspect $Log"
}
Write-Output "Exit code $CopyExitCode; review the log before proceeding."
```

`/E` includes empty directories; `/COPYALL` includes file security, owner, and audit information. `/DCOPY:DAT` includes directory timestamps. `/SECFIX` and `/TIMFIX` revisit security and times on skipped files. `/XJ` excludes junctions, which need separate inventory. `/Z` permits restartable copies; retries are bounded. `/L` previews. Codes below eight still require interpretation. These switches and return codes are documented in the [Robocopy reference](https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/robocopy).

The command does not create equivalent SMB share settings. File-system permissions and share permissions are separate controls. On each server, inspect the appropriate share with the read-only [Get-SmbShareAccess command](https://learn.microsoft.com/en-us/powershell/module/smbshare/get-smbshareaccess?view=windowsserver2025-ps):

```powershell
Get-SmbShareAccess -Name 'Finance' |
    Select-Object AccountName, AccessControlType, AccessRight
```

Use `FinanceStage` when inspecting the staging share. Recreate and review required share configuration separately, including encryption, access-based enumeration, and caching policy.

## Repeat deltas and reconcile deletions

After pre-seeding, repeat the copy while source users continue working. Keep each log and investigate locked, failed, or excluded files. A successful live copy is not an application-consistent snapshot: files can change while the tree is being traversed.

The example deliberately does not delete destination-only files. A source deletion or rename can therefore leave an obsolete destination object. Track these differences explicitly and obtain an approved reconciliation list before cutover.

Robocopy's `/MIR` includes destination deletion behavior. Do not add it casually to a destination that contains unrelated data or validation artifacts. If the migration design uses mirroring, first review a preview against a dedicated, recoverable target and confirm the direction. This article supplies no deletion command.

For validation, compare relative paths, sizes, timestamps, and security metadata. Add content hashes where the acceptance plan requires them, especially for critical files and changed data. A matching count does not prove matching content; sampled hashes do not prove the entire tree is identical.

## Freeze writers before the final sync

Ask application owners to stop submissions, flush buffered writes, and close files. Disable the relevant scheduled jobs and local producers. Apply a tested share-access or network restriction that prevents ordinary clients from reopening the source for writes while preserving the migration account's required access. Avoid changing the file ACLs merely to impose the freeze: the final security copy could carry that temporary restriction to the destination.

An empty open-file listing is evidence at one instant, not a write barrier. On the source, an administrator can inspect SMB handles with [Get-SmbOpenFile](https://learn.microsoft.com/en-us/powershell/module/smbshare/get-smbopenfile?view=windowsserver2025-ps):

```powershell
Get-SmbOpenFile |
    Select-Object FileId, Path, ClientComputerName, ClientUserName
```

Review handles belonging to the migrating tree. This does not enumerate local application handles or prove that a service cannot reopen a file. Do not force-close handles simply to produce a clean report; coordinate application shutdown so buffered work is not lost.

Run the final delta after the freeze, reconcile approved deletions, and repeat verification. Keep normal destination writers blocked. Proceed only when exceptions are resolved and the remaining outage budget covers identity changes and client validation.

## Move the name and authentication together

DNS maps a name to an address; it does not transfer an existing SMB session or file handle. A lower DNS time-to-live can help new lookups converge, but cached records and established connections still need consideration.

Kerberos authentication also depends on a service principal name, or SPN, associated with the correct server account. Microsoft's [SMB alias troubleshooting guidance](https://learn.microsoft.com/en-us/troubleshoot/windows-server/networking/dns-cname-alias-cannot-access-smb-file-server-share) recommends configuring a supported computer-name alias rather than relying on a bare DNS CNAME. Have the directory and file-service administrators rehearse the identity move; do not register the same identity on both writable servers.

For a managed server-identity migration, [Storage Migration Service cutover](https://learn.microsoft.com/en-us/windows-server/storage/storage-migration-service/cutover) coordinates computer identity and network changes. That is an alternative migration workflow, not an extra step to layer onto an unrelated manual rename plan.

From a representative Windows client, these read-only checks inspect DNS and current SMB connections:

```powershell
Resolve-DnsName -Name 'files.example.com' -Type A -DnsOnly
Get-SmbConnection |
    Select-Object ServerName, ShareName, UserName, Dialect, NumOpens
```

[Resolve-DnsName](https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname?view=windowsserver2025-ps) and [Get-SmbConnection](https://learn.microsoft.com/en-us/powershell/module/smbshare/get-smbconnection?view=windowsserver2025-ps) answer different questions. Seeing the expected address does not prove an application reconnected. Confirm the destination receives the test client's session and that authentication uses the intended identity.

## Reopen with a clear rollback boundary

Allow controlled test traffic first. Under representative user and service identities, verify permitted reads and writes, expected denials, rename behavior, and application open/save/reopen flows. Use a designated test folder and record its cleanup separately from migration reconciliation.

Before new destination writes, rollback can usually return service to the preserved source using the rehearsed identity reversal. After destination writes begin, simply pointing clients back risks losing those changes. Keep both sides fenced while reconciling any new data if rollback becomes necessary.

Once validation passes, enable normal destination writers and keep the old source protected from ordinary writes. Monitor failures and access to the old path before decommissioning it. The completion evidence should show one writable authority, accepted file and permission checks, successful client reconnection, and a documented recovery path.
