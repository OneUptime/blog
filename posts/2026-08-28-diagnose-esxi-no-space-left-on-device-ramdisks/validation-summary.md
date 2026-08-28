# Validation Summary: Diagnose ESXi `No Space Left on Device` Errors When VMFS Has Free Space

## Status

validated

## Post Type

Technical troubleshooting guide

## Technologies Covered

- VMware vSphere and ESXi 7.x/8.x
- ESXi VisorFS ramdisks and file tables/inodes
- VMFS, vFAT, ESX-OSData, persistent scratch, and syslog storage
- ESXi Shell utilities including `df`, `vdf`, `vdu`, `du`, `find`, `grep`, and `sort`
- VMware vSAN trace ramdisks
- VMware NSX-T host services and ramdisks

## Sources Consulted

- [Investigating disk space on an ESXi host (Broadcom KB 318926)](https://knowledge.broadcom.com/external/article/318926/investigating-disk-space-on-an-esxi-host.html)
- [Identifying and Resolving Full Ramdisk Issues in ESXi Environments (Broadcom KB 377985)](https://knowledge.broadcom.com/external/article/377985)
- [ESXi Ramdisk `/tmp` is 100% full (Broadcom KB 429012)](https://knowledge.broadcom.com/external/article/429012/esxi-ramdisk-tmp-is-100-full.html)
- [ESXi host not responding due to high disk space usage in the `/tmp` directory (Broadcom KB 318795)](https://knowledge.broadcom.com/external/article/318795)
- [ESXi host RAM disk is full (Broadcom KB 316556)](https://knowledge.broadcom.com/external/article/316556)
- [Error: the file table of the `var` ramdisk is full (Broadcom KB 376243)](https://knowledge.broadcom.com/external/article/376243)
- [ESXi/ESX error: No free space left on device (Broadcom KB 342658)](https://knowledge.broadcom.com/external/article/342658)
- [ESXi RAM disk full due to a locked virtual machine log file (Broadcom KB 306892)](https://knowledge.broadcom.com/external/article/306892)
- [Creating a persistent scratch location for ESXi 8.x/7.x (Broadcom KB 317689)](https://knowledge.broadcom.com/external/article/317689)
- [ESXi upgrade failure due to insufficient memory available to create ramdisk `stagebootbank` (Broadcom KB 313531)](https://knowledge.broadcom.com/external/article/313531)
- [The ramdisk `vsantraces` is full on ESXi (Broadcom KB 326990)](https://knowledge.broadcom.com/external/article/326990)
- [`/tmp` ramdisk full with `vim-cmd*.txt` files due to `nsx-exporter` OOM (Broadcom KB 388053)](https://knowledge.broadcom.com/external/article/388053)
- [Restarting Management Agents in ESXi (Broadcom KB 320280)](https://knowledge.broadcom.com/external/article/320280)
- [ESXCLI `system visorfs` command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_system.html)

## Issues Found

- The cleanup commands used unquoted angle-bracket placeholders, which the ESXi shell interprets as redirection rather than path placeholders. Replaced them with quoted shell variables containing clearly marked example values.
- The cleanup sequence could attempt `rm` even if the preceding copy failed, and its destination directory was not created. Added `mkdir -p` and joined creation, copy, and removal with `&&`, so removal occurs only after the preceding operations succeed.
- The file-count commands were described as locating a directory with many small files, but they return aggregate regular-file counts for the specified trees and do not count every file-table object. Corrected the description and added that the counts are a diagnostic starting point rather than complete file-table utilization.
- The `vim-cmd*.txt` example was attributed broadly to runaway scripts. Broadcom documents this pattern specifically for an NSX-T `nsx-exporter` memory-leak/OOM condition, so the producer attribution was corrected.
- “NSX trace areas” implied a generic NSX trace ramdisk. Reworded this as “NSX-specific ramdisks,” while retaining `vsantraces` as the vSAN trace example.

## Review Notes

The `df -h`, `vdf -h`, `/var` symlink inspection, `vdu -ah`, `du`, `find`, `grep`, `sort`, and `ls` commands match current Broadcom procedures for ESXi 7.x and 8.x. Broadcom also confirms the separate byte-capacity and file-table/inode exhaustion modes, the documented SNMP trap-file defect, the locked `/tmp/vmware-root/vmware-vmx-*.log` scenario, persistent-scratch behavior, and the cautions around VMware Tools images, management-agent restarts, deletion, and rebooting.

The `/tmp/stagebootbank` path is not by itself proof of RAM pressure, but the post accurately says that it can involve staging-memory pressure and directs readers to the release-specific KB. All six links in the post resolve to the intended Broadcom articles. ESXi 9.x and product-specific remediation remain deliberately outside the guide's 7.x/8.x scope.
