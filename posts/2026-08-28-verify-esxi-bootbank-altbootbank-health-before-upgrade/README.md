# How to Verify ESXi `bootbank` and `altbootbank` Health Before an Upgrade

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VMware, ESXi, vSphere, bootbank, altbootbank, vFAT, Upgrade, Lifecycle Manager

Description: Verify ESXi bootbank links, filesystems, capacity, boot configuration, and vLCM prechecks before an upgrade changes either boot image.

---

ESXi uses two boot banks so an update can stage a new image while retaining the previous image for rollback. An upgrade should not begin when `/bootbank` or `/altbootbank` points into `/tmp`, a bank is missing, `boot.cfg` is unreadable, a vFAT filesystem is corrupt, or the boot device is unhealthy.

These checks are most useful before a maintenance window, not after staging has already altered a bank. The first sections are read-only. Any filesystem repair belongs in maintenance mode with a current host backup, out-of-band console access, and the exact Broadcom procedure open.

This guide focuses on ESXi 7.x and 8.x. Older layouts can contain additional vFAT scratch and locker partitions, while ESXi 7.x and later normally use two vFAT boot-bank partitions. Do not classify a volume by size alone.

## Establish Recovery Prerequisites

Before examining or repairing boot media:

- Verify remote-console access and that the server can boot approved recovery media.
- Back up the ESXi host configuration and download it off the host.
- Record the current build, image profile, OEM add-on, firmware baseline, and boot device.
- Confirm the target release, server, controllers, NICs, and boot device in the Broadcom Compatibility Guide and OEM documentation.
- Evacuate the host and use maintenance mode before `dosfsck` or any modifying command.

Capture the running version and profile:

```bash
vmware -vl
esxcli software profile get
```

The profile identifies the running image. It does not prove that both on-disk banks are writable and healthy.

## Verify Both Root-Level Links

Inspect the root directory:

```bash
ls -l / | grep -E 'bootbank|altbootbank'
```

Both links should resolve through `/vmfs/volumes/<UUID>` to persistent volumes. Treat any of these as a stop condition:

- either link is absent or broken;
- a link points to `/tmp/bootbank...` or `/tmp/altbootbank...`;
- the target volume does not exist;
- reading the target returns I/O errors.

Broadcom documents vLCM failures where `bootbank` points to a temporary directory because ESXi cannot access the physical boot media. Rebooting or forcing the upgrade without diagnosing the boot device does not make that bank durable.

Confirm that each bank has a readable boot configuration:

```bash
ls -l /bootbank/boot.cfg /altbootbank/boot.cfg
head -n 20 /bootbank/boot.cfg
head -n 20 /altbootbank/boot.cfg
```

`altbootbank` normally contains the previous image, so its contents and build references need not match the active bank. The health requirement is that it is the intended persistent bank and its files can be read—not that both banks are identical.

## Map the Links to Filesystems and Devices

List mounted filesystems:

```bash
esxcli storage filesystem list
df -h
```

Match the UUIDs from the root-level links to the vFAT entries. Record each bank's UUID, size, free space, and mount state. An unexpected third boot-bank-like vFAT volume can also fail lifecycle validation; investigate whether stale installation media or a wrongly presented LUN is visible rather than deleting a partition on sight.

Map each confirmed bank UUID to its underlying device and partition:

```bash
vmkfstools -P /vmfs/volumes/<bootbank-uuid>
vmkfstools -P /vmfs/volumes/<altbootbank-uuid>
```

Then identify the actual boot device in the storage inventory:

```bash
esxcli storage core device list | grep -E 'Display Name|Is Boot Device'
```

The `Part of:` device and partition reported by `vmkfstools -P` must be recorded exactly. Never run a repair command against a guessed `naa.`, `mpx.`, or NVMe partition.

Check the server's storage-controller, USB/SD, NVMe, or boot-LUN health through its hardware management interface. A clean filesystem check cannot correct failing flash media, path loss, controller errors, or a SAN zoning problem.

## Check Logs Before Touching the Filesystem

Search for evidence of bank, vFAT, and boot-device failures:

```bash
grep -Ei 'bootbank|altbootbank|vfat|dosfsck|I/O error' /var/run/log/lifecycle.log /var/run/log/vmkernel.log /var/run/log/esxupdate.log | tail -n 200
```

Stop the upgrade if logs report `altbootbank is invalid`, failure to load `boot.cfg`, vFAT corruption, device timeouts, or bank links being created under `/tmp`. Resolve the underlying condition first.

Also ensure both vFAT banks have sensible free space in `df -h`. Do not delete VIB payloads or arbitrary files from either bank to manufacture free space; image tools manage bank contents as a unit.

## Run the Supported Filesystem Check

Broadcom's vFAT corruption KB instructs administrators to place the host in maintenance mode, identify the exact vFAT partitions, and check each one with `dosfsck`. The vLCM precheck itself invokes a non-writing form similar to:

```bash
dosfsck -V -n "/dev/disks/<exact-device-id>:<partition>"
```

Run this only against the two bank partitions you mapped, during the approved window. `-n` answers repair questions with no and is appropriate for verification. Preserve the complete output.

A clean check can access the last sector, read the FAT structures, and finish without filesystem errors. A hang, I/O error, unreadable last sector, orphaned entries, or reported corruption is a failed readiness check even if the link and `boot.cfg` currently work.

Broadcom's repair procedure uses writing forms of `dosfsck`, including `dosfsck -a -w`, and sometimes booting the same-build ESXi ISO. Those commands modify the filesystem. Do not turn a verification run into an unattended repair: keep the host in maintenance mode, confirm the target partition, preserve the backup, and follow KB 345227 or a Broadcom Support plan exactly. If repair does not produce a clean repeat check, replace unhealthy boot media or reinstall according to the supported recovery plan.

## Run Lifecycle and Hardware Prechecks

After both banks pass the storage and filesystem checks, run the vSphere Lifecycle Manager image validation, hardware-compatibility check, and remediation precheck for the actual desired image. Do not treat a successful `dosfsck` as approval for an incompatible target image.

The readiness gate should include:

- both links target persistent, mounted vFAT volumes;
- both `boot.cfg` files are readable;
- both bank filesystems have free space and clean read-only checks;
- the physical boot device reports healthy and stable;
- no recent bootbank I/O or temporary-link errors recur;
- the host configuration backup is stored off-host;
- vLCM and hardware compatibility prechecks pass.

## Verify After the Upgrade

Following the upgrade and reboot, repeat the link, filesystem, `boot.cfg`, log, and device-health checks before exiting maintenance mode. Confirm the expected build with:

```bash
vmware -vl
esxcli software profile get
```

Verify that the previous image now occupies the rollback bank as expected. Do not immediately perform another patch, VIB install, or removal: Broadcom notes that later image operations can discard the older rollback copy, leaving only the most recent previous image.

## Rollback and Recovery Cautions

The Shift+R boot rollback is useful only while `altbootbank` contains a valid previous image. It rolls back the ESXi image, not external firmware, VM data, or every configuration dependency. Record firmware changes separately and confirm that the previous drivers remain compatible before relying on rollback.

Partition recreation, formatting, `partedUtil delete`, and manual edits to `boot.cfg` are recovery operations, not health checks. Use them only for the exact diagnosed condition under Broadcom or OEM guidance.

## Limitations and Version Scope

ESXi installation layouts vary by original install release, boot-media type, and later partition conversion. KB 345227 notes that a vFAT corruption issue was fixed in ESXi 8.0 Update 3b, but that does not make all later boot-media or filesystem failures impossible. Always match the current build and symptoms to the latest KB.

## Official Documentation

- [Corrupt vFAT bootbanks cause upgrade and precheck failures (Broadcom KB 345227)](https://knowledge.broadcom.com/external/article/345227/a-problem-with-one-or-more-vfat-bootbank.html)
- [Patching fails when bootbank points to `/tmp` (Broadcom KB 426834)](https://knowledge.broadcom.com/external/article/426834/unable-to-patch-or-upgrade-an-esxi-host.html)
- [Identify active bootbank volumes and duplicate system volumes (Broadcom KB 399336)](https://knowledge.broadcom.com/external/article/399336/esxi-hosts-show-intermittent-not-respond.html)
- [ESXi validation reports three boot banks instead of two (Broadcom KB 433821)](https://knowledge.broadcom.com/external/article/433821/resolving-validation-error-this-esxi-hos.html)
- [Back up and restore ESXi host configuration (Broadcom KB 313510)](https://knowledge.broadcom.com/external/article/313510/how-to-back-up-and-restore-the-esxi-host.html)
- [Check ESXi host compatibility before upgrade (Broadcom KB 381824)](https://knowledge.broadcom.com/external/article/381824/checking-vmware-esxi-host-compatibility.html)

## Conclusion

Healthy boot banks are persistent, correctly linked, readable, clean at the vFAT layer, backed by healthy media, and accepted by the real upgrade precheck. Verify all of those conditions before staging an image, and keep repair commands separate from read-only readiness checks.
