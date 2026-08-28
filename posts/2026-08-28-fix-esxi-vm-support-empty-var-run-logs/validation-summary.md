# Validation Summary: How to Fix an ESXi `vm-support` Bundle with Empty `/var/run/logs`

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- VMware vSphere ESXi
- VMware vCenter Server and the vSphere Client
- ESXi `vm-support` diagnostic bundles
- ESXi `vmsyslogd` and `Syslog.global` settings
- ESXi persistent scratch and ESX-OSData
- VMFS and NFS datastores
- ESXi Shell, ESXCLI, `vim-cmd`, `vmkfstools`, and `vmfsfilelockinfo`

## Sources Consulted
- [Broadcom KB 433331: Exported ESXi system log bundle contains empty /var/run/logs directory](https://knowledge.broadcom.com/external/article/433331)
- [Broadcom KB 439289: /var/run/log inside the ESXi Support Bundle is empty and only contains vit.conf.backup](https://knowledge.broadcom.com/external/article/439289)
- [Broadcom KB 437245: ESXi support bundle fails to collect logs on NFS mounts with execute permissions](https://knowledge.broadcom.com/external/article/437245)
- [Broadcom KB 432642: Missing /var/run/log Directory in ESXi Log Bundles on NFS Storage](https://knowledge.broadcom.com/external/article/432642)
- [Broadcom KB 416273: ESXi logs missing under /var/run/log directory in the Support Bundle](https://knowledge.broadcom.com/external/article/416273)
- [Broadcom KB 434167: Specific log files are missing when exporting ESXi host system logs from the vSphere Client](https://knowledge.broadcom.com/external/article/434167)
- [Broadcom KB 313542: Collecting diagnostic information for VMware ESX/ESXi using vm-support command](https://knowledge.broadcom.com/external/article/313542)
- [Broadcom KB 319493: Collecting diagnostic information for VMware ESXi using vSphere Client](https://knowledge.broadcom.com/external/article/319493)
- [Broadcom KB 306962: Location and Contents of ESXi log files](https://knowledge.broadcom.com/external/article/306962)
- [Broadcom KB 317689: Creating a persistent scratch location for ESXi 8.x/7.x](https://knowledge.broadcom.com/external/article/317689)
- [Broadcom KB 318939: Configuring syslog on ESXi](https://knowledge.broadcom.com/external/article/318939)
- [Broadcom KB 342571: Using syslog log markers from the ESXi command line](https://knowledge.broadcom.com/external/article/342571)
- [Broadcom KB 387609: Error "Device or resource busy" when viewing ESXi log files](https://knowledge.broadcom.com/external/article/387609)
- [Broadcom ESXCLI command reference: `esxcli system` commands](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_system.html)

## Issues Found
- The Base-manifest diagnostic was incorrectly presented as applicable to exports from either vCenter or the standalone ESXi Host Client. Broadcom documents the component selector in the vSphere Client workflow, while the Host Client exposes **Generate support bundle** without that selector. The text now limits the Base check to vSphere Client exports that offered a specific-log selection.
- The inaccessible-OSData section treated replacement or reinstallation of the boot design as the next step even though an inaccessible boot device does not, by itself, prove physical-media failure. The text now says to investigate and remediate the access failure first and to replace or reinstall only when hardware or media failure is confirmed.
- The acceptance test unconditionally required rotated `hostd` files. A healthy new log target may not have reached its first rotation, so the test could produce a false failure. The requirement now applies only to recent rotated files that exist on the live host.
- The NFS execute-bit mechanism lacked its documented version scope. The limitations now state that the detailed execute-bit exclusion case is documented for ESXi 8.x and remains dependent on the NFS server's ACL and export behavior.

## Review Notes
- All eight Broadcom links originally listed in the post returned successful responses and resolved to the intended articles.
- The `vm-support`, ESXCLI, `vim-cmd`, `vmkfstools`, archive-inspection, and syslog-marker examples match the reviewed official syntax. No deprecated command or flag was found.
- Broadcom documents `/var/run/log` as the live ESXi log location, while KB 433331 deliberately uses `/var/run/logs` for the extracted bundle path; the post's singular/plural distinction is correct.
- Broadcom states that `vm-support` options vary by ESXi release, so the post correctly directs readers to the target host's `vm-support -h` output before using additional flags.
- No ESXi host was available in the review workspace; ESXi-specific commands were validated against current Broadcom documentation and command references rather than executed on a host.
