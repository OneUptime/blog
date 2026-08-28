# Validation Summary: How to Verify ESXi `bootbank` and `altbootbank` Health Before an Upgrade

## Status
validated

## Post Type
Technical operations guide

## Technologies Covered

- VMware vSphere ESXi 7.x and 8.x
- ESXi `bootbank`, `altbootbank`, and `boot.cfg`
- vFAT filesystems and `dosfsck`
- ESXCLI and `vmkfstools`
- vSphere Lifecycle Manager (vLCM)
- Local, USB/SD, NVMe, and SAN boot storage
- ESXi image rollback and host-configuration backup

## Sources Consulted

- [Broadcom KB 345227: Corrupted vFAT partitions causing upgrade or pre-check failures](https://knowledge.broadcom.com/external/article/345227/a-problem-with-one-or-more-vfat-bootbank.html)
- [Broadcom KB 426834: Unable to patch or upgrade when `bootbank` points to `/tmp`](https://knowledge.broadcom.com/external/article/426834/unable-to-patch-or-upgrade-an-esxi-host.html)
- [Broadcom KB 318029: Bootbank loads in `/tmp` after reboot](https://knowledge.broadcom.com/external/article/318029/bootbank-loads-in-tmp-after-reboot-of-es.html)
- [Broadcom KB 340188: Auto Deploy stateless caching and stateful installs](https://knowledge.broadcom.com/external/article/340188/understanding-vsphere-auto-deploy-statel.html)
- [Broadcom KB 373403: Stateless Auto Deploy host using `/tmp/_bootbank`](https://knowledge.broadcom.com/external/article/373403)
- [Broadcom KB 305267: Determine the ESXi boot drive](https://knowledge.broadcom.com/external/article/305267/determine-the-boot-drive-for-the-esxi-ho.html)
- [Broadcom KB 342630: Identify ESXi boot LUNs](https://knowledge.broadcom.com/external/article/342630/identifying-esxi-boot-luns-for-boot-from.html)
- [Broadcom ESXCLI command reference: storage namespace](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html)
- [Broadcom ESXCLI command reference: software namespace](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_software.html)
- [Broadcom KB 399336: Duplicate BOOTBANK and OSDATA volumes](https://knowledge.broadcom.com/external/article/399336/esxi-hosts-show-intermittent-not-respond.html)
- [Broadcom KB 433821: Validation reports three boot banks instead of two](https://knowledge.broadcom.com/external/article/433821/resolving-validation-error-this-esxi-hos.html)
- [Broadcom KB 376175: Bootbank rotation and one-level rollback behavior](https://knowledge.broadcom.com/external/article/376175/unable-to-rollback-esxi-version-as-bootb.html)
- [Broadcom KB 316592: Revert to a previous ESXi version](https://knowledge.broadcom.com/external/article/316592/reverting-to-a-previous-version-of-esxi.html)
- [Broadcom KB 313510: Back up and restore ESXi host configuration](https://knowledge.broadcom.com/external/article/313510/how-to-back-up-and-restore-the-esxi-host.html)
- [Broadcom KB 381824: Check ESXi host compatibility before upgrade](https://knowledge.broadcom.com/external/article/381824/checking-vmware-esxi-host-compatibility.html)
- [Broadcom KB 426960: vLCM image-based remediation pre-check](https://knowledge.broadcom.com/external/article/426960/precheck-fails-for-imagebased-remediatio.html)
- [Broadcom KB 412988: vLCM hardware-compatibility checks](https://knowledge.broadcom.com/external/article/412988/error-the-image-has-hardware-compatibili.html)
- [Broadcom KB 415405: End of General Support for vSphere 7.0](https://knowledge.broadcom.com/external/article/415405/end-of-general-support-for-vsphere.html)

## Issues Found

- The original scope did not exclude stateless Auto Deploy hosts, for which an in-memory `/tmp/_bootbank` can be expected and does not by itself prove failed physical boot media. Scoped the guide to statefully installed hosts and directed stateless and stateless-cached hosts to their Auto Deploy workflow.
- The temporary-bank stop condition named only `/tmp/bootbank...` and `/tmp/altbootbank...`, while official examples also use names such as `/tmp/_bootbank...`. Changed the condition to cover any bank-link target under `/tmp` for the stateful hosts in scope.
- The text described `esxcli storage filesystem list` as listing only mounted filesystems. The command lists volumes available to the host and exposes their mount state. Corrected the description while retaining `df -h` for space usage.
- The text referred to a literal `Part of:` field in `vmkfstools -P` output. Current official vFAT examples normally label the mapping `Partitions spanned (on "disks"):`. Replaced the version-sensitive label with the accurate instruction to record the device and partition reported by the command.

## Review Notes

- All shell and ESXCLI commands are syntactically valid for the stated ESXi versions. `esxcli software profile get` reports the current in-memory image by default, which matches its use before staging and after reboot in this guide.
- The vLCM lifecycle log in KB 345227 shows the exact non-writing check `/bin/dosfsck -V -n <device-partition>`. The documented repair form `dosfsck -a -w`, maintenance-mode requirement, last-sector check, same-build ISO fallback, and ESXi 8.0 Update 3b fix note are represented accurately.
- All six links in the post resolve to relevant Broadcom KB articles. KB 433821 specifically lists VCF 5.2.x and ESXi 8.x in its environment; the guide uses it only to establish that an anomalous third bank can fail validation.
- vLCM hardware checks are not a substitute for full server, firmware, NIC, storage-controller, and boot-device certification. The post correctly requires separate Broadcom Compatibility Guide and OEM verification.
- An ESXi host-configuration backup does not include bootbank contents or virtual-machine inventory, and restoring it normally requires a matching build and host UUID. The post does not claim otherwise and correctly requires an off-host backup as one recovery prerequisite.
- vSphere 7.0 reached End of General Support on October 2, 2025. Its inclusion remains relevant for hosts being assessed for an upgrade, but support status and the exact source/target build must be checked before work begins.
