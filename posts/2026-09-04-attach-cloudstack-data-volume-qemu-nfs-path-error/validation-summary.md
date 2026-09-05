# Validation Summary: How to Attach a Data Volume When CloudStack Reports a QEMU or NFS Path Error

## Status
validated

## Post Type
Technical troubleshooting guide with shell commands and CloudStack API examples.

## Technologies Covered
- Apache CloudStack and CloudMonkey (`cmk`)
- KVM, libvirt, and QEMU disk images
- NFS, export permissions, and Linux storage utilities
- systemd journals, SELinux, and AppArmor
- Guest filesystem recovery and volume attachment

## Sources Consulted
- [CloudStack storage guide](https://docs.cloudstack.apache.org/en/latest/adminguide/storage.html): placement, NFS mount options, maintenance, attachment, and migration.
- [CloudStack KVM installation](https://docs.cloudstack.apache.org/en/latest/installguide/hypervisor/kvm.html).
- CloudStack 4.23 API references: [attachVolume](https://cloudstack.apache.org/api/apidocs-4.23/apis/attachVolume.html), [detachVolume](https://cloudstack.apache.org/api/apidocs-4.23/apis/detachVolume.html), [listVolumes](https://cloudstack.apache.org/api/apidocs-4.23/apis/listVolumes.html), [listVirtualMachines](https://cloudstack.apache.org/api/apidocs-4.23/apis/listVirtualMachines.html), [listStoragePools](https://cloudstack.apache.org/api/apidocs-4.23/apis/listStoragePools.html), [queryAsyncJobResult](https://cloudstack.apache.org/api/apidocs-4.23/apis/queryAsyncJobResult.html), [migrateVolume](https://cloudstack.apache.org/api/apidocs-4.23/apis/migrateVolume.html), and [migrateVirtualMachineWithVolume](https://cloudstack.apache.org/api/apidocs-4.23/apis/migrateVirtualMachineWithVolume.html).
- [Apache CloudMonkey usage](https://github.com/apache/cloudstack-cloudmonkey/wiki/Usage) and [project README](https://github.com/apache/cloudstack-cloudmonkey).
- libvirt: [storage management](https://libvirt.org/storage.html), [virsh command reference](https://libvirt.org/manpages/virsh.html), [daemon architecture](https://libvirt.org/daemons.html), and [QEMU driver security](https://libvirt.org/drvqemu.html).
- [QEMU image utility](https://www.qemu.org/docs/master/tools/qemu-img.html): `info --backing-chain` and concurrent-access limitations.
- Upstream NFS utilities manuals: [showmount](https://man7.org/linux/man-pages/man8/showmount.8.html), [rpcinfo](https://man7.org/linux/man-pages/man8/rpcinfo.8.html), [nfsstat](https://man7.org/linux/man-pages/man8/nfsstat.8.html), and [exports](https://man7.org/linux/man-pages/man5/exports.5.html).
- Linux utility manuals: [namei](https://man7.org/linux/man-pages/man1/namei.1.html), [findmnt](https://man7.org/linux/man-pages/man8/findmnt.8.html), [lsblk](https://man7.org/linux/man-pages/man8/lsblk.8.html), [blkid](https://man7.org/linux/man-pages/man8/blkid.8.html), [mount](https://man7.org/linux/man-pages/man8/mount.8.html), [dmesg](https://man7.org/linux/man-pages/man1/dmesg.1.html), and [getent](https://man7.org/linux/man-pages/man1/getent.1.html).
- [journalctl](https://man7.org/linux/man-pages/man1/journalctl.1.html) and GNU utility manuals for [df](https://man7.org/linux/man-pages/man1/df.1.html), [stat](https://man7.org/linux/man-pages/man1/stat.1.html), and [test](https://man7.org/linux/man-pages/man1/test.1.html).

## Issues Found
1. **Administrative visibility was implicit.** Specified an administrator account for the initial inventory. Storage identifiers and infrastructure details are permission-dependent; `listall=true` does not grant additional privileges.
2. **The journal query covered only monolithic libvirt.** Added a note to inspect `virtqemud` and `virtstoraged` journals on hosts using modular daemons, where relevant errors may otherwise be missed.
3. **The access-test command hard-coded `qemu` despite the adjacent account caveat.** Replaced it with `QEMU_USER` and explained substitution. Clarified that `test -r` checks only readability and does not establish write access or reproduce QEMU's security context.
4. **NFS discovery results lacked an NFSv4 caveat.** Explained that NFSv4-only servers may not expose the MNT service and that MNT/rpcbind query failures alone do not prove storage is unavailable.
5. **Read-only image inspection did not address concurrent writers.** Required confirming the image and backing chain are not being modified before metadata inspection, since active-image queries can encounter locking failures or inconsistent state.
6. **Migration was presented as recovery from an unrepaired pool without a source-access prerequisite.** Clarified that migration requires readable source data; inaccessible data requires restored access or backup recovery. Also scoped the standalone live-migration restriction to CloudStack with NFS-backed KVM storage, avoiding a blanket statement about KVM or other storage providers.
7. **Guest kernel-log access assumed an unrestricted account.** Added `sudo` to `dmesg` because distributions can restrict kernel-log access.
8. **A read-only recovery mount was insufficiently qualified.** Explained journal replay on a plain read-only mount and the ext4 `ro,noload` option, together with the consistency implications of suppressing recovery.

## Review Notes
- The post is technically relevant and was validated after the targeted corrections. Its original sections and troubleshooting sequence were preserved.
- All five original documentation links were checked. The web reader could not retrieve the 4.23 API page, but direct HTTP retrieval returned 200 and its content was inspected. The remaining 4.23 API references were also retrieved directly. Earlier 4.22 API pages were consulted as a cross-check, not substituted for the linked version.
- The required attach parameters, optional device selection, detach-by-volume-ID form, list filters, and async-job query parameters match the API documentation. CloudMonkey supports the split verb/resource command form used here.
- The actual API name is `migrateVirtualMachineWithVolume` (singular). The storage guide uses a plural spelling in its prose; the post correctly retains the API reference spelling.
- NFS `vers` and `nconnect` guidance agrees with the current storage guide. Its documented prerequisites include libvirt 5.1 or newer and kernel support for `nconnect`; administrators must check their deployed versions. The guide also documents a PowerFlex/ScaleIO exception to the general standalone live-migration limitation.
- UUIDs, paths, pool names, domain names, and account names are placeholders. Commands require configured CloudMonkey credentials and the relevant Linux utilities. A newly allocated volume may not yet have physical storage assigned; correlate the failed job with agent and management logs.
- Shell examples were checked for Bash syntax without executing them. No live CloudStack, KVM, NFS, or guest environment was supplied, so attachment, migration, access policies, and recovery behavior were reviewed against documentation rather than integration-tested.
- Validation metadata was parsed and the final diff was checked for whitespace errors.
