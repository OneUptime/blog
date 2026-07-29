# What Data Can You Safely Store on an Azure VM Temporary Disk?

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Azure, Azure Virtual Machines, Temporary Storage, Data Durability, Cloud Architecture

Description: Use Azure VM temporary disks only for reproducible caches, buffers, scratch files, swap, and other data whose loss cannot affect recovery.

---

The Azure VM temporary disk is host-local storage. It is fast and included with supported VM sizes, but it is not backed by durable Azure Storage. Azure can erase and recreate it when the VM is deallocated, redeployed, resized onto another host, deleted, evicted, or affected by certain maintenance and healing operations.

The safe rule is:

> Store data on the temporary disk only when the VM and application remain correct after that data disappears without warning.

If loss requires restore from backup, human reconstruction, or business reconciliation, the data does not belong there.

## Temporary disk is not a managed data disk

A managed OS or data disk persists independently of the VM's current host. A temporary disk is physically associated with that host.

| Property | Temporary disk | Managed data disk |
|---|---|---|
| Backed by remote Azure Storage | No | Yes |
| Survives deallocation | No | Yes |
| Included with VM size | When the size provides it | Separately provisioned |
| Azure Backup target for durable data | No | Supported configurations |
| Suitable for authoritative application data | No | Yes, with workload protection |

Some newer VM sizes use local NVMe devices; others expose a SCSI temporary resource disk. Some sizes have no temporary disk. Read the selected size's storage specifications rather than assuming every VM has one.

## Safe use cases

### Rebuildable caches

Examples include:

- downloaded package caches;
- rendered thumbnail caches;
- application object caches;
- search or query caches that can be repopulated from an authoritative store;
- local copies of immutable artifacts.

Cache misses after host movement must degrade performance, not correctness. Control cache fill so a fleet does not overload the source after simultaneous loss.

### Scratch and intermediate files

Temporary storage suits data used only during a bounded computation:

- decompression workspace;
- compiler intermediates;
- media-transcoding scratch;
- external sort spill;
- batch-processing partitions whose task can retry;
- temporary upload chunks when the original remains durable.

The scheduler or application must detect interruption and restart from a durable input or checkpoint.

### Buffers with a durable upstream

A local buffer can smooth bursts only when the producer can replay or the consumer tolerates loss. If the local queue is the sole copy of an accepted request, it is business data and needs durable storage.

Use acknowledgements carefully. Do not acknowledge a message as durable after writing only to the temporary disk.

### Page file, swap, and `tempdb`

Azure Windows images commonly place the page file on temporary storage, often shown as `D:`. Linux images can configure swap on the resource disk. SQL Server `tempdb` is a common workload-specific use because SQL Server recreates it at startup.

These uses require startup automation. The device and its contents can be new after host movement, so create directories, permissions, mount options, and service dependencies on every boot.

## Unsafe use cases

Do not use the temporary disk as the only location for:

- customer uploads;
- database data or transaction logs;
- message queues requiring delivery;
- audit or security logs;
- cryptographic keys or certificates;
- application configuration not stored elsewhere;
- deployment artifacts that cannot be fetched again;
- backup files;
- recovery checkpoints whose loss restarts an unacceptable amount of work;
- the only copy of diagnostic evidence needed after a crash.

Copy important logs and results to durable storage continuously or at a frequency that meets the recovery point objective.

## Do not rely on a drive letter or device name

On Windows, the temporary disk is often `D:`, but another data disk or image customization can change drive-letter assignment. Microsoft documents a procedure for workloads that require `D:` as a durable data drive, which includes moving the temporary disk to another letter.

Identify the temporary disk by its Azure/image convention, label, and expected device properties. Do not initialize or format disks solely by ordinal number in a generic startup script.

On Linux, marketplace images have historically mounted resource storage at locations such as `/mnt/resource`, while newer images and NVMe-based sizes vary. Cloud-init can manage the resource disk instead of `waagent`. Inspect:

```bash
lsblk -o NAME,MODEL,SERIAL,SIZE,FSTYPE,LABEL,MOUNTPOINTS
findmnt
```

Use the current VM-size and image documentation to identify local storage. Never put an unrecognized device into an automated `mkfs` command.

## Events that can erase temporary data

Plan for loss during:

- Stop (deallocate);
- redeploy to another node;
- resize that moves the VM;
- delete;
- Spot eviction with deallocation or deletion behavior;
- host failure;
- maintenance that cannot use live migration;
- scale-set reimage or healing;
- ephemeral OS disk reprovisioning, when that separate feature is used.

A guest reboot may leave the same host-local content present, but that observation is not a durability guarantee. Software must behave correctly even if the next reboot coincides with host movement.

## Temporary disk and ephemeral OS disk are different

An **ephemeral OS disk** stores the operating system itself on local VM storage for supported sizes and stateless workloads. A **temporary disk** is an additional local scratch device.

They share a lack of remote persistence, but their lifecycle and placement choices differ. Do not infer that a VM has an ephemeral OS disk merely because it exposes local temporary storage.

## Initialize it as disposable state

A robust boot unit should:

1. discover and validate the intended temporary device;
2. create the mount point or directory;
3. set ownership and permissions;
4. create application subdirectories;
5. start dependent services only after initialization;
6. tolerate an empty device;
7. publish a readiness failure if setup is unsafe.

The application should expose:

- cache rebuild progress;
- spill-space capacity;
- temporary-disk latency and errors;
- eviction/retry counts;
- durable-copy lag for any exported results.

Keep disk-full behavior safe. A full scratch disk should fail the task or shed work, not corrupt the persistent database.

## Protect sensitive temporary data

Temporary does not mean nonsensitive. Secrets, personal data, and decrypted working sets can still exist while the VM runs.

Use:

- encryption at host where required and supported;
- application-level encryption for sensitive scratch;
- least-privilege file permissions;
- secure cleanup appropriate to the threat model;
- short retention and bounded directory quotas.

Encryption does not make the data durable. It protects confidentiality while the lifecycle remains ephemeral.

## Decide with recovery objectives

For each candidate dataset, ask:

1. What is the system of record?
2. Can this exact data be regenerated?
3. How long will regeneration take?
4. Can the producer replay after an acknowledged write?
5. What happens if every VM loses its cache simultaneously?
6. Does backup or compliance require retention?

Use the temporary disk only when the answers demonstrate that loss is an expected operating condition.

## Official Documentation

- [Local temporary storage and ephemeral OS disks](https://learn.microsoft.com/en-us/azure/virtual-machines/ephemeral-os-disks)
- [Use the D drive as a data drive on a Windows VM](https://learn.microsoft.com/en-us/azure/virtual-machines/windows/change-drive-letter)
- [Maintenance for Azure virtual machines](https://learn.microsoft.com/en-us/azure/virtual-machines/maintenance-and-updates)
- [Frequently asked questions about Azure VM disks](https://learn.microsoft.com/en-us/azure/virtual-machines/faq-for-disks)
- [Redeploy a Windows VM to a new Azure node](https://learn.microsoft.com/en-us/troubleshoot/azure/virtual-machines/windows/redeploy-to-new-node-windows)

