# Validation Summary: How to Understand LVM Concepts: PV, VG, LV Explained for Ubuntu

## Status
validated

## Post Type
Tutorial / Conceptual Guide

## Technologies Covered
- LVM2 (Logical Volume Manager) on Linux
- Ubuntu disk management
- Device mapper (`/dev/mapper`)
- Related concepts: RAID arrays (`/dev/md*`), LUKS encrypted devices

## Sources Consulted
- LVM2 official man pages: `pvcreate(8)`, `vgcreate(8)`, `lvcreate(8)`, `pvdisplay(8)`, `vgdisplay(8)`, `lvdisplay(8)`, `pvs(8)`, `vgs(8)`, `lvs(8)`, `lvmdiskscan(8)`
- Red Hat LVM Administrator's Guide (https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_managing_logical_volumes/)
- Ubuntu Server documentation on LVM (https://ubuntu.com/server/docs/device-mapper)
- LVM2 source documentation (lvm2 package, sourceware.org/lvm2)

## Issues Found
No technical issues found.

All technical claims and code examples in the post were verified:

- **Default PE size of 4 MiB**: Correct — this is the LVM2 default since lvm2 was introduced.
- **PV extent math**: 500 GiB = 128000 PEs at 4 MiB each, minus 1 PE for metadata area = 127999 Total PE. The `pvdisplay` output (Free 65536 + Allocated 62463 = 127999) is internally consistent.
- **LV extent math**: 100 GiB / 4 MiB = 25,600 LEs. Correct.
- **VG aggregate math**: 255998 PEs × 4 MiB = 999.992 GiB ≈ "999.99 GiB". Correct.
- **Device path conventions**: `/dev/<vg_name>/<lv_name>` is indeed a symbolic link to the device-mapper node at `/dev/mapper/<vg_name>-<lv_name>`. Correct.
- **Attribute strings**: `wz--n-` for a writeable/resizable/normal VG and `-wi-ao----` for a writeable, inherited-allocation, active, open LV are valid LVM2 attribute formats.
- **All LVM commands referenced** (`pvcreate`, `vgcreate`, `lvcreate`, `pvs`, `vgs`, `lvs`, `pvdisplay`, `vgdisplay`, `lvdisplay`, `lvmdiskscan`) exist and use correct syntax/flags. The `-L 100G`, `-l 100%FREE`, and `-n <name>` flags for `lvcreate` are all current.
- **PV source types** (whole disk, partition, `/dev/md*` RAID, `/dev/mapper/*` LUKS device): all valid PV source types.
- **Ubuntu installer naming** (`ubuntu-vg`, `ubuntu-lv`): matches what Ubuntu's Subiquity installer produces when LVM is selected.
- **Metadata redundancy claim** ("every PV in a VG has a copy of this metadata"): correct by default — `pvcreate` writes one metadata area per PV unless overridden with `--metadatacopies 0`.

The internal consistency between the example outputs is also good:
- `pvs` shows PFree of 150g + 350g = 500g free → 500g allocated
- `vgs` shows VFree 500.00g — matches
- `lvs` shows 100g + 300g + 100g = 500g allocated — matches

## Review Notes

- The ASCII diagram in "How the Layers Relate" shows the `backups` LV as 600GB, while the `lvs` output example later shows `backups` as 100.00g. These are two independent hypothetical examples and each is internally consistent on its own, so this is not a technical error — but a future revision could align the two examples to avoid mild reader confusion.

- The post correctly hedges with "in many cases" when describing online resize. Worth noting (not an error) that ext4 and XFS support online grow but XFS does not support shrink at all, and ext4 shrink requires unmounting. The post doesn't make incorrect claims here.

- The default PE size of 4 MiB is documented as correct, but it's worth noting that LVM2 historically used a 32 MiB default in much older versions. The current default has been 4 MiB for many years, so the claim is accurate for any reasonably modern Ubuntu release.

- The `lvmdiskscan` command is deprecated in newer LVM2 versions (deprecated upstream around lvm2 2.03.x) in favor of `lvmdevices` and standard `lvs/pvs/vgs --foreign --shared` workflows, but it still works on Ubuntu LTS releases. Not worth changing, but a future revision might mention this.
