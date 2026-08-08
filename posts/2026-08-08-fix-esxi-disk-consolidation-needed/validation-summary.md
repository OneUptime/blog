# Validation Summary: Fix Virtual Machine Disks Consolidation Is Needed Safely

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- VMware vSphere and vCenter Server
- VMware ESXi and the ESXi Shell
- VMFS, NFS, vSAN, and vVol datastores
- VMware snapshots, consolidation helper disks, and VMDK chains
- Snapshot-based backup proxies and VMDK file locking
- `esxcli`, `vmkfstools`, and `vmfsfilelockinfo`

## Sources Consulted

- [Broadcom KB 414589: The message "Virtual Machine Consolidation Needed" appears for a specific virtual machine](https://knowledge.broadcom.com/external/article/414589/the-message-virtual-machine-consolidatio.html)
- [Broadcom KB 371714: FAQ: Delete All Snapshots and Consolidate Snapshots Feature](https://knowledge.broadcom.com/external/article/371714/faq-delete-all-snapshots-and-consolidate.html)
- [Broadcom KB 344708: Managing snapshots in vSphere Web Client](https://knowledge.broadcom.com/external/article/344708/managing-snapshots-in-vsphere-web-client.html)
- [Broadcom KB 323397: Snapshot removal stops a virtual machine for long time](https://knowledge.broadcom.com/external/article/323397/snapshot-removal-stops-a-virtual-machine.html)
- [Broadcom KB 316414: How to calculate current snapshot size, estimate consolidation times, and understand performance factors](https://knowledge.broadcom.com/external/article/316414/how-to-calculate-snapshot-consolidation.html)
- [Broadcom KB 398339: VM consolidation fails with "File too large"](https://knowledge.broadcom.com/external/article/398339/vm-consolidation-tasks-fail-with-the-err.html)
- [Broadcom KB 377677: Consolidation reports "File too large" when hosts have stale expanded-datastore metadata](https://knowledge.broadcom.com/external/article?articleNumber=377677)
- [Broadcom KB 410950: Consolidation reports "File too large" after a host-side free-space query failure](https://knowledge.broadcom.com/external/article/410950/vm-snapshot-consolidation-failed-with-er.html)
- [Broadcom KB 430686: Validate whether a VM uses a VMDK from its VMX file](https://knowledge.broadcom.com/external/article/430686/how-to-validate-if-a-vm-is-using-a-vmdk.html)
- [Broadcom KB 414970: Inspect a virtual disk chain with `vmkfstools -q -v10`](https://knowledge.broadcom.com/external/article/414970/virtual-machine-hard-disk-shows-0b-in-vc.html)
- [Broadcom KB 314365: Investigating virtual machine file locks on ESXi hosts](https://knowledge.broadcom.com/external/article/314365/investigating-virtual-machine-file-locks.html)
- [Broadcom KB 374141: Snapshot consolidation failure due to a file lock](https://knowledge.broadcom.com/external/article/374141/snapshot-consolidation-failure-failed-to.html)
- [Broadcom KB 314378: Creating snapshots in a different location](https://knowledge.broadcom.com/external/article/314378/creating-snapshots-in-a-different-locati.html)
- [Broadcom KB 321365: Snapshot consolidation fails due to locks held by backup software](https://knowledge.broadcom.com/external/article/321365/snapshot-consolidation-fails-due-to-lock.html)
- [Broadcom KB 343977: SESparse consolidation fails with "Device or resource busy"](https://knowledge.broadcom.com/external/article/343977/consolidating-snapshot-failed-failed-to.html)
- [Broadcom KB 418516: "Unable to enumerate all disks" caused by a vSAN descriptor lock](https://knowledge.broadcom.com/external/article/418516/error-unable-to-enumerate-all-disks-fail.html)
- [Broadcom KB 370584: "Unable to enumerate all disks" caused by a missing vSAN backing object](https://knowledge.broadcom.com/external/article/370584/vms-on-vsan-fail-to-power-on-with-unable.html)
- [Broadcom KB 316545: Undetected snapshots and active-leaf disk cloning](https://knowledge.broadcom.com/external/article/316545/undetected-snapshots-in-snapshot-manager.html)
- [Broadcom KB 320280: Restarting management agents in ESXi](https://knowledge.broadcom.com/external/article/320280/restarting-the-management-agents-in-esxi.html)
- [Broadcom KB 440803: Troubleshooting the VMkernel path to NFS storage](https://knowledge.broadcom.com/external/article/440803/troubleshooting-network-access-from-esxi.html)
- [Broadcom KB 326438: vSAN Health Service checks](https://knowledge.broadcom.com/external/article/326438/vsan-skyline-health-check-information.html)
- [Broadcom KB 318825: Best practices for VMware snapshots](https://knowledge.broadcom.com/external/article/318825/best-practices-for-using-vmware-snapshot.html)
- [Broadcom ESXCLI command reference: `storage filesystem`](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html)

## Issues Found

- The stun description implied that a consolidation stun is always brief. It now states that the stun is usually brief but can become disruptive under heavy guest writes or storage latency, matching Broadcom's helper-delta guidance.
- The post used `vmkfstools -e` without requiring the VM to be powered off. On a running VM, that mode can report a lock failure that is not proof of a broken chain. It was replaced with the current read-only `vmkfstools -q -v10` query and the correct registered-host context.
- The `vmfsfilelockinfo` example supplied a bare `-v`, although that option requires a vCenter address and user in the canonical syntax. The invalid flag was removed, and the text now directs the command at the implicated VMFS flat, delta, or SESparse extent.
- The capacity check considered only datastores holding VM disks. It now also covers delta or redo logs and a custom snapshot working directory, because `workingDir` with `snapshot.redoNotWithParent` can place redo logs elsewhere.
- The failure classifier treated task text as sufficient by itself. It now requires supporting log context and notes that `Unable to enumerate all disks` on vSAN can result from a lock or a missing backing object, not only a broken descriptor chain.
- The `File too large` branch assumed that adding datastore headroom was always the fix. It now requires verification of actual free space and host logs because stale datastore-size metadata and host-side free-space query failures can produce the same task text.
- The post classified every `Device or resource busy` error as unhealthy storage. Broadcom documents both file-lock and transient SESparse bitmap causes, so the branch now calls for interpreting the full log context.
- The individual `vmkfstools -i` recovery path did not explicitly require the VM to be powered off or identify the current active descriptor as the source. Both requirements are now stated.
- The validation checklist required every disk to use its base descriptor even while allowing intentionally retained snapshots. It now checks that the active chain resolves through any intentionally retained snapshot leaf to the expected base.
- The management-agent statement was made non-absolute: restarting `hostd` or `vpxa` normally does not power off running VMs, but Broadcom warns that it can disrupt management and running tasks.

## Review Notes

All six links in the post's Official Documentation section resolve to the intended current Broadcom articles. The 1.5-times free-space rule remains correctly limited to Broadcom's documented `File too large` scenario rather than presented as a universal formula. The stated 32-snapshot limit is the overall supported maximum; unusually disk-heavy VMs can have lower limits. No deprecated configuration fields or broken URLs remain in the post.
