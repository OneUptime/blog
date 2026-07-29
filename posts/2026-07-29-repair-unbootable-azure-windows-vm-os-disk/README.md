# Repair an Unbootable Azure Windows VM with a Repair VM

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Windows Server, Disaster Recovery, Troubleshooting

Description: Repair an unbootable Azure Windows VM offline by creating a protected OS disk copy, attaching it to a repair VM, and restoring the repaired copy.

---

When a Windows Azure VM cannot reach a usable boot or recovery screen, offline repair lets you work on a copy of its OS disk from another Windows VM. Azure VM repair commands automate creation of the copy, repair VM, disk attachment, and final OS-disk swap.

Do not detach and modify the only production OS disk without a rollback. Capture Boot diagnostics, preserve the original disk, and make symptom-specific changes to the copy.

## Diagnose before touching the disk

In the portal, open **Boot diagnostics** and save:

- screenshot;
- serial log;
- exact stop code or boot message;
- time of the last known good boot;
- recent Windows Update, driver, encryption, antivirus, or storage changes.

With Azure CLI:

```bash
az vm boot-diagnostics get-boot-log \
  --resource-group myResourceGroup \
  --name myVM
```

Confirm the problem is in the guest. A failed Azure Start operation with `AllocationFailed` is not repaired by editing Windows. Likewise, an RDP-only failure can often be recovered through Serial Console, VMAccess, or guest firewall repair without swapping disks.

## Record the VM and disk configuration

Export the model:

```bash
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --query "{
    id:id,
    location:location,
    size:hardwareProfile.vmSize,
    image:storageProfile.imageReference,
    osDisk:storageProfile.osDisk,
    dataDisks:storageProfile.dataDisks,
    security:securityProfile
  }" \
  --output json
```

The image reference identifies the source publisher, offer, SKU, and version; it does not establish the deployed disk's boot generation. Resolve the managed OS disk and query that resource directly:

```bash
OS_DISK_ID="$(
  az vm show \
    --resource-group myResourceGroup \
    --name myVM \
    --query storageProfile.osDisk.managedDisk.id \
    --output tsv
)"

az disk show \
  --ids "$OS_DISK_ID" \
  --query "{generation:hyperVGeneration,sku:sku.name,sizeGiB:diskSizeGb}" \
  --output json
```

Record:

- OS disk resource ID and SKU;
- Gen1 or Gen2 boot generation;
- Trusted Launch, Secure Boot, and vTPM state;
- Azure Disk Encryption, BitLocker, and key dependencies;
- availability zone;
- data-disk LUNs;
- backup and snapshot status.

Encryption changes the supported workflow. Microsoft's VM repair commands support specific Azure Disk Encryption configurations, including managed disks with supported single-pass encryption. Follow the encryption-specific procedure when the documented prerequisites do not match.

## Use Azure VM repair commands

Install or update the CLI extension:

```bash
az extension add --name vm-repair
az extension update --name vm-repair
```

Create the repair VM and a copy of the broken OS disk:

```bash
az vm repair create \
  --resource-group myResourceGroup \
  --name myVM \
  --repair-username repairadmin \
  --repair-password "$AZURE_REPAIR_VM_PASSWORD" \
  --verbose
```

Supply the password through an approved secret workflow and do not place it in a repository or shared shell transcript. Review `az vm repair create --help` for private networking, public-IP association, and encrypted-disk options.

The command creates temporary resources, attaches the OS-disk copy to the repair VM, and adds tags used by later commands. **Do not modify those tags.** Microsoft warns that the restore command depends on them.

Repair-command scripts:

- require suitable permissions to create VMs, disks, networking, resource groups, and tags;
- require outbound TCP 443 from the repair VM;
- allow only one script at a time;
- cannot cancel a running script;
- time out after 90 minutes.

## Inspect the attached copy

Connect to the repair VM through the approved path. Open Disk Management or use PowerShell:

```powershell
Get-Disk | Sort-Object Number |
  Format-Table Number, FriendlyName, OperationalStatus, PartitionStyle, Size

Get-Volume |
  Format-Table DriveLetter, FileSystemLabel, FileSystem, HealthStatus, Size, SizeRemaining
```

Identify the attached disk by size, partition layout, and Azure LUN. Do not assume it is Disk 1 or drive `F:`. Bring only the copied disk online if needed. For a Gen2 disk, the EFI System Partition may need a temporary drive letter for bootloader repairs.

Before any write operation, verify you are not targeting the repair VM's own OS disk.

## Apply a symptom-specific repair

Offline repair is a transport mechanism, not one universal command. Use the Microsoft troubleshooting article that matches the boot error.

Common categories include:

- filesystem corruption;
- full OS volume;
- a pending or failed Windows Update;
- broken Boot Configuration Data or EFI files;
- invalid storage or filter driver;
- registry configuration that disables a critical service;
- BitLocker recovery or encryption configuration.

Potential tools include `chkdsk`, DISM with `/Image`, offline SFC, Registry Editor with an offline hive, and `bcdboot`. Each can change the disk materially. Use only the syntax for the detected Windows version, generation, partition letters, and error.

For example, first inspect a copied NTFS volume before deciding whether repair is needed:

```powershell
chkdsk F: /scan
```

`/scan` still must target the correct copied volume. If the volume is BitLocker-protected, unlock it through the supported key process before filesystem or Windows tools can read it.

For a pending update, list offline packages before removing anything:

```powershell
dism /image:F:\ /get-packages
```

Do not paste a package name from another incident. Remove or revert only the package state identified in this disk's logs and Microsoft's matching recovery guide.

## Use built-in repair scripts when appropriate

Azure VM repair includes a script library:

```bash
az vm repair list-scripts
```

If the Microsoft troubleshooting guide specifies a run ID:

```bash
az vm repair run \
  --resource-group myResourceGroup \
  --name myVM \
  --run-on-repair \
  --run-id documented-run-id \
  --verbose
```

Choose the run ID from the current script list and the symptom-specific official article. A general test script is not a substitute for identifying the fault.

## Restore the repaired OS disk

Before restore:

1. close tools using the attached disk;
2. flush pending writes;
3. take the repaired disk offline cleanly if the procedure requires it;
4. preserve repair logs;
5. confirm the original VM name and resource-group capitalization match the create command.

Restore:

```bash
az vm repair restore \
  --resource-group myResourceGroup \
  --name myVM \
  --verbose
```

This swaps the repaired copy into the original VM. Verify the VM model points to the expected OS disk, then start and watch Boot diagnostics.

## Validate beyond a successful boot

After Windows reaches the sign-in screen:

- confirm RDP only through an approved path;
- review System and Application event logs;
- run filesystem and component-store health checks appropriate to the repair;
- verify Windows Update and driver state;
- verify VM Agent is Ready;
- verify all extensions;
- validate application services and data disks;
- confirm monitoring, backup, and security tooling.

Keep the original disk until the workload has passed an agreed observation period. The repair process can leave both original and copied disks, which also means storage charges continue until deliberate cleanup.

## Manual portal workflow

Microsoft also documents a portal process to attach a failed OS disk to a repair VM. Use it when automation prerequisites do not fit. The safe outline is the same:

1. stop the affected VM;
2. snapshot the OS disk;
3. create a managed disk from the snapshot;
4. attach the copy as a data disk to a compatible repair VM;
5. repair the copy;
6. detach it cleanly;
7. swap the original VM's OS disk to the repaired copy.

Preserve generation, region, zone, security type, encryption, and disk compatibility.

## Official Documentation

- [Repair a Windows VM with Azure VM repair commands](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/repair-windows-vm-using-azure-virtual-machine-repair-commands)
- [Attach an OS disk to a recovery VM with Azure PowerShell](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-recovery-disks-windows)
- [Attach an OS disk to a repair VM in the portal](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/troubleshoot-recovery-disks-portal-windows)
- [Troubleshoot Azure Windows VM boot errors](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/boot-error-troubleshoot)
