# Validation Summary: How to Persist ESXi Logs and Scratch Data on Hosts That Boot from USB or SD Card

## Status
validated

## Post Type
Technical operations guide / troubleshooting tutorial

## Technologies Covered
- VMware ESXi 7.x and 8.x
- VMware vSphere Client
- ESX-OSData and VMFS-L system storage
- ESXi scratch configuration
- vmsyslogd and local/remote syslog
- VMkernel coredump targets
- VMFS, NFS, and vSAN datastores
- USB and SD-card boot media
- ESXCLI and `vim-cmd`

## Sources Consulted
- Broadcom KB 317689, Creating a persistent scratch location for ESXi 8.x/7.x: https://knowledge.broadcom.com/external/article/317689
- Broadcom KB 317690, System logs are stored on non-persistent storage: https://knowledge.broadcom.com/external/article/317690
- Broadcom KB 302451, Determining whether an ESXi host has persistent logging: https://knowledge.broadcom.com/external/article/302451
- Broadcom KB 318939, Configuring syslog on ESXi: https://knowledge.broadcom.com/external/article/318939
- Broadcom KB 342571, Using syslog log markers from the ESXi command line: https://knowledge.broadcom.com/external/article/342571
- Broadcom ESXCLI system command reference: https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_system.html
- Broadcom ESXCLI storage command reference: https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html
- Broadcom KB 326522, Redirecting system logs to a vSAN object causes an ESXi host lock up: https://knowledge.broadcom.com/external/article/326522
- Broadcom KB 318875, Storing ESXi coredump and scratch partitions in vSAN: https://knowledge.broadcom.com/external/article/318875
- Broadcom KB 435145, ESXi datastore unmount fails due to persistent scratch location: https://knowledge.broadcom.com/external/article/435145
- Broadcom KB 374917, Shared-storage scratch reverting during boot because the datastore mounts too late: https://knowledge.broadcom.com/external/article/374917
- Broadcom KB 423053, Device or resource busy errors caused by shared scratch/log folders: https://knowledge.broadcom.com/external/article/423053
- Broadcom KB 433331, Incomplete support bundles caused by non-unique shared log directories: https://knowledge.broadcom.com/external/article/433331
- Broadcom KB 437245, NFS ACL/export behavior that prevents support-bundle log collection: https://knowledge.broadcom.com/external/article/437245
- Broadcom KB 314320, Configuring ESXi coredump to file instead of partition: https://knowledge.broadcom.com/external/article/314320
- Broadcom KB 317631, SD card/USB boot device revised guidance: https://knowledge.broadcom.com/external/article/317631
- Broadcom KB 415405, End of General Support for vSphere 7.0: https://knowledge.broadcom.com/external/article/415405

## Issues Found
- The controlled-reboot test asked readers to confirm that pre-reboot "rotated log content" remained after first creating a syslog marker. `esxcli system syslog mark` writes a marker to the syslog outputs but does not force log rotation, so rotated content is not guaranteed to exist for that test. Changed the step to verify that the pre-reboot marker remains in the datastore-backed logs.

## Review Notes
- All scratch, syslog, coredump, filesystem, and version-reporting commands use valid ESXi 7.x/8.x syntax. The documented advanced-setting names, UUID scratch path, bracketed syslog datastore path, reload behavior, and reboot requirements match current Broadcom guidance.
- All external links in the post resolve to the intended GitHub profile or Broadcom documentation page.
- Broadcom continues to support USB/SD boot through VCF 9.0 update releases on previously certified server platforms, but recommends persistent media and gives 32 GB minimum and 128 GB recommended sizing for ESXi 8.x persistent boot devices. The post correctly presents persistent media as the preferred design rather than claiming that every existing USB/SD installation is unsupported.
- ESXi 7.x reached End of General Support on October 2, 2025. The procedure remains technically applicable to existing 7.x hosts, but supported environments should plan an upgrade to a currently supported release.
