# How to Build an ESXi VM and Datastore Inventory Report with PowerCLI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, PowerCLI, Inventory, Datastore Capacity, Reporting, Automation

Description: Build read-only PowerCLI CSV reports for ESXi virtual machines, virtual disks, snapshots, and datastore capacity with explicit collection errors.

---

A useful ESXi inventory report answers three separate questions: which VMs exist and where they run, which virtual disks they use, and how much capacity each datastore currently reports. Keeping those as separate CSV files avoids flattening one-to-many relationships into misleading duplicate rows.

The runbook below connects to one vCenter or standalone ESXi endpoint, uses documented PowerCLI `Get-*` cmdlets, exports timestamped local files, and disconnects in a `finally` block. It makes no vSphere configuration changes. Snapshot collection is optional because it adds calls and needs datastore-browse privileges to populate all snapshot data.

## Define the Scope and Meaning First

Decide whether the report is for:

- one vCenter inventory;
- one directly managed standalone ESXi host;
- a named folder, cluster, or datacenter; or
- several vCenter Servers collected into separate output sets.

Connect to vCenter for a managed environment. Querying each ESXi host separately can produce duplicates, omit vCenter-only context, and use local permissions that differ from the central inventory.

The measurements in this report have specific meanings:

- VM `ProvisionedSpaceGB` is the capacity provisioned to a VM as represented by PowerCLI, not a promise of physical array allocation.
- VM `UsedSpaceGB` is the VM's observed datastore usage, not guest filesystem usage.
- Disk `CapacityGB` is virtual disk capacity, not necessarily the bytes currently allocated on thin storage.
- Datastore `CapacityGB` and `FreeSpaceGB` are datastore-level figures. Array thin provisioning, deduplication, compression, snapshots, and replication can make back-end usage different.

PowerCLI's current command index notes that output properties carrying `GB` use base-2 GiB units. Keep the property names in the CSV so report consumers do not assume decimal GB.

## Prepare a Read-Only Account

Use an account with read access to the required vCenter objects and datastores. Snapshot disk-size information requires the **Datastore > Browse datastore** privilege according to the official `Get-Snapshot` reference. Missing privileges should create an explicit collection error, not be interpreted as zero snapshots or zero usage.

Do not embed a password in the script or command history. `Connect-VIServer` can prompt for credentials, accept a `PSCredential`, or use an approved credential mechanism. Validate the server certificate through the organization's trust process. Do not globally suppress invalid-certificate checks merely to make scheduled reporting succeed.

Use a supported current VCF PowerCLI or VMware PowerCLI release compatible with the vCenter version. Confirm the loaded module and cmdlet help before scheduling:

```powershell
Get-Module VMware.VimAutomation.Core -ListAvailable |
    Sort-Object Version -Descending |
    Select-Object -First 1 Name, Version, Path

Get-Help Connect-VIServer -Full
Get-Help Get-VM -Full
Get-Help Get-Datastore -Full
```

## Use Three Normalized Reports

Save the following as `Export-VSphereInventory.ps1`. The script sanitizes text fields that could be interpreted as spreadsheet formulas, retains errors in a fourth CSV, and never substitutes missing data with a false zero.

```powershell
[CmdletBinding()]
param(
    [Parameter(Mandatory)]
    [string]$Server,

    [Parameter()]
    [string]$OutputDirectory = (Join-Path $PWD 'vsphere-inventory'),

    [Parameter()]
    [switch]$IncludeSnapshots
)

Set-StrictMode -Version Latest
$ErrorActionPreference = 'Stop'

function ConvertTo-CsvSafeText {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return $null
    }

    $text = [string]$Value
    if ($text -match '^[=+@-]') {
        return "'$text"
    }
    return $text
}

function ConvertTo-RoundedNumber {
    param([AllowNull()][object]$Value)

    if ($null -eq $Value) {
        return $null
    }
    return [math]::Round([double]$Value, 2)
}

Import-Module VMware.VimAutomation.Core -ErrorAction Stop
New-Item -ItemType Directory -Path $OutputDirectory -Force | Out-Null

$stamp = Get-Date -Format 'yyyyMMdd-HHmmss'
$connection = $null
$collectionErrors = [System.Collections.Generic.List[object]]::new()
$vmRows = [System.Collections.Generic.List[object]]::new()
$diskRows = [System.Collections.Generic.List[object]]::new()
$datastoreRows = [System.Collections.Generic.List[object]]::new()

try {
    $connection = Connect-VIServer -Server $Server -ErrorAction Stop
    $vms = @(Get-VM -Server $connection | Sort-Object Name)

    foreach ($vm in $vms) {
        $datastoreNames = $null
        try {
            $datastoreNames = @(
                Get-Datastore -RelatedObject $vm -Server $connection |
                    Sort-Object Name -Unique |
                    Select-Object -ExpandProperty Name
            ) -join ';'
        }
        catch {
            $collectionErrors.Add([pscustomobject]@{
                Scope = 'VM datastores'
                Object = $vm.Name
                Error = $_.Exception.Message
            })
        }

        $snapshotCount = $null
        $oldestSnapshot = $null
        if ($IncludeSnapshots) {
            try {
                $snapshots = @(Get-Snapshot -VM $vm -Server $connection)
                $snapshotCount = $snapshots.Count
                if ($snapshots.Count -gt 0) {
                    $oldestSnapshot = (
                        $snapshots | Sort-Object Created | Select-Object -First 1
                    ).Created.ToUniversalTime().ToString('o')
                }
            }
            catch {
                $collectionErrors.Add([pscustomobject]@{
                    Scope = 'VM snapshots'
                    Object = $vm.Name
                    Error = $_.Exception.Message
                })
            }
        }

        $hostName = $null
        if ($null -ne $vm.VMHost) {
            $hostName = $vm.VMHost.Name
        }

        $configuredGuest = $null
        if (
            $null -ne $vm.ExtensionData -and
            $null -ne $vm.ExtensionData.Config
        ) {
            $configuredGuest = $vm.ExtensionData.Config.GuestFullName
        }

        $vmRows.Add([pscustomobject]@{
            Endpoint = (ConvertTo-CsvSafeText $connection.Name)
            VM = (ConvertTo-CsvSafeText $vm.Name)
            PowerState = [string]$vm.PowerState
            VMHost = (ConvertTo-CsvSafeText $hostName)
            NumCPU = $vm.NumCpu
            MemoryGB = (ConvertTo-RoundedNumber $vm.MemoryGB)
            ProvisionedSpaceGB = (ConvertTo-RoundedNumber $vm.ProvisionedSpaceGB)
            UsedSpaceGB = (ConvertTo-RoundedNumber $vm.UsedSpaceGB)
            ConfiguredGuest = (ConvertTo-CsvSafeText $configuredGuest)
            Datastores = (ConvertTo-CsvSafeText $datastoreNames)
            SnapshotCount = $snapshotCount
            OldestSnapshotUTC = $oldestSnapshot
        })

        try {
            foreach ($disk in @(Get-HardDisk -VM $vm -Server $connection)) {
                $diskRows.Add([pscustomobject]@{
                    Endpoint = (ConvertTo-CsvSafeText $connection.Name)
                    VM = (ConvertTo-CsvSafeText $vm.Name)
                    Disk = (ConvertTo-CsvSafeText $disk.Name)
                    CapacityGB = (ConvertTo-RoundedNumber $disk.CapacityGB)
                    StorageFormat = [string]$disk.StorageFormat
                    Persistence = [string]$disk.Persistence
                    DiskType = [string]$disk.DiskType
                    Filename = (ConvertTo-CsvSafeText $disk.Filename)
                })
            }
        }
        catch {
            $collectionErrors.Add([pscustomobject]@{
                Scope = 'VM disks'
                Object = $vm.Name
                Error = $_.Exception.Message
            })
        }
    }

    foreach ($datastore in @(Get-Datastore -Server $connection | Sort-Object Name)) {
        $capacity = [double]$datastore.CapacityGB
        $free = [double]$datastore.FreeSpaceGB
        $percentFree = $null
        if ($capacity -gt 0) {
            $percentFree = [math]::Round(($free / $capacity) * 100, 2)
        }

        $datastoreRows.Add([pscustomobject]@{
            Endpoint = (ConvertTo-CsvSafeText $connection.Name)
            Datastore = (ConvertTo-CsvSafeText $datastore.Name)
            Type = [string]$datastore.Type
            CapacityGB = [math]::Round($capacity, 2)
            FreeSpaceGB = [math]::Round($free, 2)
            UsedSpaceGB = [math]::Round(($capacity - $free), 2)
            PercentFree = $percentFree
            Accessible = $datastore.ExtensionData.Summary.Accessible
            MaintenanceMode = [string]$datastore.ExtensionData.Summary.MaintenanceMode
        })
    }

    $vmRows | Export-Csv -Path (Join-Path $OutputDirectory "vms-$stamp.csv") -NoTypeInformation -Encoding UTF8
    $diskRows | Export-Csv -Path (Join-Path $OutputDirectory "vm-disks-$stamp.csv") -NoTypeInformation -Encoding UTF8
    $datastoreRows | Export-Csv -Path (Join-Path $OutputDirectory "datastores-$stamp.csv") -NoTypeInformation -Encoding UTF8

    if ($collectionErrors.Count -gt 0) {
        $collectionErrors | Export-Csv -Path (Join-Path $OutputDirectory "collection-errors-$stamp.csv") -NoTypeInformation -Encoding UTF8
    }
}
finally {
    if ($null -ne $connection) {
        Disconnect-VIServer -Server $connection -Confirm:$false
    }
}
```

Run it interactively first so certificate and authentication behavior are visible:

```powershell
./Export-VSphereInventory.ps1 -Server vcsa.example.com -OutputDirectory ./inventory-exports -IncludeSnapshots
```

Omit `-IncludeSnapshots` for a faster base inventory. An omitted snapshot count is intentionally blank, not zero.

## Understand What the Script Does Not Prove

The reports are a point-in-time management view. They do not prove:

- that a VM-level backup is recoverable;
- that guest filesystems are healthy or have free space;
- that thin-provisioned array capacity is sufficient;
- that an unregistered VMDK is orphaned;
- that every inaccessible host returned current data; or
- that an empty snapshot result means no delta files exist on a datastore.

`Get-VM` returns inventory VMs, and `Get-HardDisk -VM` returns disks related to each VM. Neither is an orphan-file scanner. Datastore Browser, supported storage APIs, and a careful reference comparison are needed before classifying an unregistered file as deletable.

Likewise, Snapshot Manager and `Get-Snapshot` show managed snapshot metadata. A failed backup or incomplete consolidation can leave delta files without a visible snapshot entry. Treat mismatches as investigation signals, never deletion instructions.

## Validate the First Export

Before scheduling, compare samples with the vSphere Client:

1. Match total VM and datastore counts for the selected scope.
2. Check one powered-on and one powered-off VM.
3. Check a VM with disks on multiple datastores.
4. Check a thin disk and a thick disk.
5. Check one VM with a known snapshot when snapshot collection is enabled.
6. Reconcile capacity for a VMFS, NFS, vSAN, or vVol datastore used in the environment.
7. Review `collection-errors` rather than discarding it.

PowerCLI object properties can be null when a host or datastore is disconnected, inaccessible, or hidden by permissions. A report pipeline should alert on missing expected scope, not publish a smaller file as a healthy result.

## Make Scheduled Runs Auditable

For automation, pin and test the PowerCLI version, use a dedicated least-privilege identity, validate TLS, protect the output directory, and log start time, endpoint, module version, row counts, errors, and exit status. Keep exports according to a defined retention policy because VM names, paths, networks, and capacities can be sensitive infrastructure data.

Add a threshold or dashboard only after the raw inventory is reconciled. A `PercentFree` alert is useful, but consolidation, snapshots, thin-array oversubscription, vSAN policy overhead, and expected growth all affect the real remediation threshold.

## Scale Beyond a Small Inventory

The readable script makes per-VM related-object calls. That is appropriate for a modest environment and easy to verify, but it can be slow at large scale. PowerCLI's `Get-View -Property` parameter can request selected vSphere API properties efficiently. A production rewrite can collect `VirtualMachine` and `Datastore` views in bulk, then join managed-object references locally.

Do not optimize by silently removing errors or broadening permissions. Benchmark against a non-production vCenter session, preserve the same field definitions, and reconcile row counts before replacing the simple implementation.

## Official Documentation

- [Connect-VIServer command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/connect-viserver)
- [Get-VM command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-vm)
- [PowerCLI VirtualMachine properties](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/structures/vmware.vimautomation.vicore.types.v1.inventory.virtualmachine)
- [Get-Datastore command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-datastore)
- [Get-HardDisk command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-harddisk)
- [Get-Snapshot command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-snapshot)
- [Get-View command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/get-view)
- [Disconnect-VIServer command reference](https://developer.broadcom.com/powercli/latest/vmware.vimautomation.core/commands/disconnect-viserver)

## Conclusion

A trustworthy inventory report keeps VMs, disks, and datastores separate, defines what every capacity field means, and exposes missing data. Start with documented read-only cmdlets, reconcile the CSVs with the client, preserve collection errors, and optimize with selected API views only after the simple report is demonstrably correct.
