# Validation Summary: ESXi Purple Screen of Death: Evidence to Capture Before Rebooting

## Status
validated

## Post Type
Incident Response Guide / Operational Reference

## Technologies Covered
- VMware ESXi and the VMkernel
- Purple diagnostic screens (PSODs) and VMkernel coredumps
- ESX-OSData, VMFS dump files, diagnostic partitions, and network dump collection
- vSphere High Availability (HA), Fault Domain Manager (FDM), APD/PDL handling, and VM storage locks
- ESXi support bundles and the `vm-support` utility
- ESXi host logs, persistent syslog, and time synchronization
- Out-of-band server management through HPE iLO, Dell iDRAC, and Lenovo XClarity Controller
- Broadcom Compatibility Guide driver and firmware validation

## Sources Consulted
- Broadcom KB 337182, "ESX/ESXi host stops responding and displays a purple diagnostic screen": https://knowledge.broadcom.com/external/article/337182/esxesxi-host-stops-responding-and-displa.html
- Broadcom KB 343033, "Interpreting an ESXi host purple diagnostic screen (PSOD)": https://knowledge.broadcom.com/external/article/343033/interpreting-a-host-purple-diagnostic-sc.html
- Broadcom KB 406537, "Host issue with purple screen text": https://knowledge.broadcom.com/external/article/406537/host-issue-with-purple-screen-text.html
- Broadcom KB 319635, "Configuring an ESXi host to capture a VMkernel coredump from a purple diagnostic screen": https://knowledge.broadcom.com/external/article/319635
- Broadcom ESXCLI Command Reference, latest `esxcli system` commands: https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_system.html
- Broadcom KB 319492, "Configuring a diagnostic coredump partition on an ESXi host": https://knowledge.broadcom.com/external/article/319492/configuring-a-diagnostic-coredump-partit.html
- Broadcom KB 314320, "Configuring ESXi coredump to file instead of partition": https://knowledge.broadcom.com/external/article/314320/configuring-esxi-coredump-to-file-instea.html
- Broadcom KB 344063, "Configuring the Network Dump Collector service in vSphere": https://knowledge.broadcom.com/external/article/344063/configuring-the-network-dump-collector-s.html
- Broadcom KB 340049, "Permanently disable ESXi coredump file": https://knowledge.broadcom.com/external/article/340049/permanently-disable-esxi-coredump-file.html
- Broadcom KB 313542, "Collecting diagnostic information for VMware ESX/ESXi using vm-support command": https://knowledge.broadcom.com/external/article/313542
- Broadcom KB 327899, "Data collected when gathering diagnostic information from vSphere products": https://knowledge.broadcom.com/external/article/327899/data-collected-when-gathering-diagnostic.html
- Broadcom KB 306962, "Location and Contents of ESXi log files": https://knowledge.broadcom.com/external/article/306962/location-of-esxi-log-files.html
- Broadcom KB 324992, "Determining if your VMware vSphere HA cluster has experienced a host failure": https://knowledge.broadcom.com/external/article/324992/determining-if-your-vmware-vsphere-ha-cl.html
- Broadcom KB 339335, "vSphere HA virtual machine failed to failover": https://knowledge.broadcom.com/external/article/339335/vsphere-ha-virtual-machine-failed-to-fai.html
- Broadcom KB 389898, "Checking ESXi Host I/O Device Compatibility Before Upgrade Using the Broadcom Compatibility Guide": https://knowledge.broadcom.com/external/article/389898/checking-esxi-host-io-device-compatibili.html
- Broadcom KB 315329, "Supported drivers and firmware versions for I/O devices": https://knowledge.broadcom.com/external/article/315329/supported-drivers-and-firmware-versions.html
- Broadcom KB 341609, "Conditions for deploying and upgrading an ESXi host deployed using a custom image": https://knowledge.broadcom.com/external/article/341609/conditions-for-deploying-and-upgrading-a.html
- Broadcom KB 441389, hardware-memory PSOD guidance illustrating that the active stack is not necessarily the root cause: https://knowledge.broadcom.com/external/article/441389/esxi-host-experiences-psod-nmi-ipi-pani.html
- HPE iLO 6 User Guide, "Active Health System Log download methods": https://support.hpe.com/hpesc/public/docDisplay?docId=sd00002007en_us&page=GUID-D7147C7F-2016-0901-06D0-000000001A90.html
- Dell PowerEdge guidance, "Export a SupportAssist Collection Using iDRAC UI or racadm cmd": https://www.dell.com/support/kbdoc/en-us/000126308/export-a-supportassist-collection-via-idrac9
- Lenovo XClarity Controller documentation, "Downloading service data": https://pubs.lenovo.com/xcc/NN1ia_c_servicesandsupport

## Issues Found
- The coredump text said ESXi writes state to its configured target, which implied that the write succeeds. Changed it to say ESXi attempts to write to one or more configured targets.
- The reboot section and conclusion required a completed coredump. Broadcom's procedure says to wait for `Disk Dump Successful`, potentially for up to an hour, but to continue to reboot after an explicit dump failure. Updated the post to recognize successful completion, an explicit failure, or the environment's documented timeout and escalation path, and to preserve the displayed result or unresolved status.
- The post referred generically to HA agent logs. Replaced that wording with the exact `/var/run/log/fdm.log` path and specified collection from the primary and relevant secondary FDM hosts, because the primary records the host-failure declaration and HA decisions.
- The warning against disabling coredump was ambiguous about whether it meant a local target or all dump capture. Clarified that a supported network collector must be configured and verified before disabling an unsuitable local target.

## Review Notes
The two `esxcli system coredump` commands and `vm-support -w /vmfs/volumes/HealthyDatastore` are current and syntactically valid. The listed `/var/run/log` paths are also current. Broadcom qualifies automatic ESXi 7.x coredump-file creation with ESX-OSData sizing and USB/SD boot details; the post's word "normally" correctly leaves room for those cases. Broadcom Compatibility Guide entries may show the firmware used for certification rather than prescribe the latest firmware, so the post correctly also directs readers to the hardware vendor's support matrix. All six links in the post resolve to the intended Broadcom articles. No ESXi host was available in this workspace, so command validation was performed against the current official command reference and vendor documentation rather than by executing the commands.
