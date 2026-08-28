# How to Register an Orphaned ESXi VM from Its `.vmx` File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VMware, ESXi, vCenter Server, Virtual Machine, VMX, Disaster Recovery

Description: Re-register an existing VMX safely, avoid duplicate ownership and copy semantics, and verify which guest and vCenter identities were preserved.

---

An orphaned or missing inventory entry does not necessarily mean the virtual machine's files are lost. If the datastore is healthy and the original `.vmx` file and virtual disks are intact, register that configuration instead of creating a replacement VM or copying its files.

Using the same `.vmx` preserves identity stored in the VM configuration, including the configured BIOS UUID and normally its generated virtual NIC addresses. It does not promise that every vCenter-side object will remain identical. A newly created inventory object can have a different managed-object reference, and tags, permissions, alarms, DRS rules, backup associations, and monitoring relationships may need to be checked afterward.

## Determine Why the VM Is Orphaned

Do not immediately remove the existing inventory object. First determine whether the problem is:

- a stale vCenter entry after a host or HA event;
- a datastore or network path that is still inaccessible;
- a duplicate registration on another host;
- a locked `.vmx` file;
- a corrupt or syntactically invalid `.vmx` file;
- a host that cannot access one of the VM's disks, ISO images, or network backings.

Re-registration repairs inventory membership. It does not repair unavailable storage, broken snapshot chains, file locks, or an invalid configuration.

Record the VM's existing vCenter name, host, datastore path, instance UUID, BIOS UUID, MAC addresses, network port groups, tags, permissions, backup object, and DRS/HA rules while the stale object is still visible. Screenshots are useful, but export machine-readable data from the tools that own backup and policy associations when possible.

## Prove the VM Is Not Running Elsewhere

Registering the same files on two hosts can create conflicting ownership and locks. On every plausible ESXi host, list both locally registered VMs and active VM processes:

```bash
vim-cmd vmsvc/getallvms
esxcli vm process list
```

Search both outputs for the VM name and its `.vmx` datastore path. The process list catches a running VMX process that may not appear in the host inventory. Confirm in vCenter tasks and events that HA, migration, restore, replication, or backup software is not currently operating on the VM.

If the VM may still be running but vCenter cannot see it, connect directly to the ESXi Host Client and confirm its power state. Do not infer power state from an orphaned icon alone.

## Validate the Datastore Files

Browse the datastore and locate the original VM directory. At minimum, identify:

- the intended `.vmx` configuration file;
- every referenced VMDK descriptor and its backing extent or storage object;
- any active snapshot descriptor and delta files;
- the VM's NVRAM file when present;
- recent `vmware.log` files.

From ESXi Shell, quote the full path:

```bash
cd '/vmfs/volumes/DATASTORE/VM_DIRECTORY'

ls -lah
grep -n -E '^(displayName|uuid\.bios|uuid\.location|vc\.uuid|ethernet[0-9]+\.(address|addressType|generatedAddress))' \
  'VM_NAME.vmx'
grep -n -i '\.vmdk' 'VM_NAME.vmx'
```

`uuid.location` is location-derived metadata, not the guest-visible BIOS UUID. It can legitimately be rewritten when the VM's host or configuration-file location changes, so record it for diagnosis but do not require it to remain unchanged.

Do not edit UUID or MAC-address lines simply to make registration succeed. Preserve a copy of the `.vmx` before any supported repair:

```bash
cp 'VM_NAME.vmx' 'VM_NAME.vmx.pre-register-backup'
```

If the VMX is empty, malformed, or `hostd.log` reports a parse error, stop and repair or reconstruct it using the corresponding Broadcom procedure. Registration of a damaged VMX can produce an invalid object but cannot recover missing configuration.

## Remove Only a Confirmed Stale Inventory Entry

If vCenter still contains a stale or orphaned object and Broadcom's recovery procedure calls for removing it, select **Remove from Inventory** in vCenter or **Unregister** in the Host Client. Never select **Delete from Disk**. Those actions are not synonyms: removing from inventory leaves datastore files in place; deleting from disk is destructive.

Power the VM off before a planned unregister/re-register workflow. If a conflicting registration exists on another host, clear it through the host or vCenter that owns that inventory entry. Do not delete lock files manually.

## Register the Original VMX in vSphere Client

Broadcom documents this vCenter workflow:

1. Select the intended ESXi host.
2. Open its datastores and choose **Browse Files**.
3. Open the original VM directory.
4. Select the original `.vmx` file.
5. Choose **Register VM**.
6. Follow the wizard, selecting the intended name, compute resource, and folder.

The target host must have access to every referenced datastore and an appropriate network backing. Registering a VM that uses a distributed port group directly on an isolated standalone host can leave its NIC disconnected or mapped to an unavailable backing.

For a direct ESXi Host Client workflow, open **Storage**, choose the datastore, select **Register a VM**, browse to the `.vmx`, and register it.

If vCenter manages the host, normally perform the registration through the vSphere Client. Broadcom warns that bypassing vCenter to register directly on the host can cause a mismatch between the host and vCenter inventories; use host-side registration only when a scoped recovery procedure calls for it, and reconcile the inventory afterward.

## Use the CLI When the Client Is Unavailable

On the ESXi host that should own the VM, run:

```bash
vim-cmd solo/registervm \
  '/vmfs/volumes/DATASTORE/VM_DIRECTORY/VM_NAME.vmx'
```

The command returns a local VM ID on success. Verify it rather than assuming registration completed:

```bash
vim-cmd vmsvc/getallvms
vim-cmd vmsvc/power.getstate VM_ID
```

The local VM ID is not the VM's BIOS UUID and is not a durable application identity. It can differ after inventory operations.

## Answer the Moved-or-Copied Question Correctly

On some releases and workflows, the first power-on after registration asks whether the VM was moved or copied. You registered the original files in their intended identity, so choose **I moved it**. Choosing **I copied it** tells VMware to create identity values appropriate for a clone and can generate new UUID and MAC information.

Do not make this choice mechanically if the files truly are a clone. Two VMs with the same UUID or MAC address can confuse management, licensing, backup, DHCP, and network systems. This procedure is specifically for re-registering the one original VM.

## Verify Identity at Each Layer

Before reconnecting production networks, compare the post-registration object with the captured baseline:

### Guest-facing identity

- BIOS UUID exposed to the guest;
- virtual NIC MAC addresses;
- virtual disk layout and controller type;
- virtual TPM, encryption, and secure-boot configuration;
- guest hostname, IP configuration, and application identity.

### vSphere inventory identity

- vCenter folder and resource pool;
- host and datastore location;
- tags and custom attributes;
- permissions and alarms;
- DRS affinity or anti-affinity rules;
- HA overrides and VM startup settings.

### External integrations

- backup and replication object mapping;
- CMDB and monitoring identifiers;
- license bindings;
- automation that stores a vCenter MoRef, instance UUID, or path.

Broadcom has a specific procedure for registering a powered-off VM on another host without changing its inventory ID in supported vSphere 7.x and 8.x scenarios. Treat that as a scoped workflow for a VM managed by vCenter 7.x or 8.x, not as a universal guarantee for every remove-and-add operation or external integration.

## Power On in a Controlled Sequence

Before power-on:

1. Review **Edit Settings** and confirm every disk resolves to the expected descriptor.
2. Verify snapshot-chain health if snapshots exist; do not attach a base disk when the current state is in a delta disk.
3. Confirm port groups and avoid an IP or MAC collision.
4. Check that mounted ISO paths and special devices are accessible.
5. Confirm encryption keys and virtual TPM dependencies are available.

Power on the VM, then check guest disk state, networking, application consistency, VMware Tools, vCenter alarms, and the latest `vmware.log`. Reattach backup and policy objects only after verifying whether the integration recognized the existing identity or created a new object.

## Official Documentation

- [Broadcom KB 315281: register a virtual machine in vCenter Server or ESXi](https://knowledge.broadcom.com/external/article/315281/register-a-virtual-machine-to-the-vcente.html)
- [Broadcom KB 335224: add or register a VM and avoid host/vCenter inventory mismatch](https://knowledge.broadcom.com/external/article/335224/add-or-register-a-virtual-machine-vm-in.html)
- [Broadcom KB 422311: register a VM on another ESXi host without changing its inventory ID](https://knowledge.broadcom.com/external/article/422311/register-a-virtual-machine-on-another-es.html)
- [Broadcom KB 391738: recover inaccessible or orphaned VMs after a vSAN node loss](https://knowledge.broadcom.com/external/article/391738/refreshing-vsan-after-a-node-loss-and-re.html)
- [Broadcom KB 391782: registration failure caused by invalid VMX entries](https://knowledge.broadcom.com/external/article/391782/unable-to-register-virtual-machine.html)
- [Broadcom KB 344709: permissions, tasks, VMX corruption, and locks that disable registration](https://knowledge.broadcom.com/external/article/344709/virtual-machine-options-are-grayed-out-i.html)

## Conclusion

Preserve an orphaned VM by proving it is not active elsewhere, validating its original files, and registering the same `.vmx`. That maintains the guest identity stored in the configuration when moved-not copied-semantics are used. Then audit vCenter and external object mappings separately, because inventory IDs, policies, and integrations are not all stored in the VMX.
