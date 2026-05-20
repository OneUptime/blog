# Validation Summary: How to Configure Fencing (STONITH) in Pacemaker on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Pacemaker
- Corosync
- pcs
- STONITH fencing
- fence-agents
- IPMI fencing with `fence_ipmilan`
- SBD fencing
- KVM/libvirt fencing with `fence_virsh`

## Sources Consulted
- Ubuntu Server documentation: Pacemaker fence agents, including `fence_ipmilan`, `fence_sbd`, and `fence_virsh`: https://ubuntu.com/server/docs/explanation/high-availability/pacemaker-fence-agents/
- Ubuntu manpage: `fence_ipmilan`: https://manpages.ubuntu.com/manpages/noble/man8/fence_ipmilan.8.html
- Ubuntu manpage: `fence_virsh`: https://manpages.ubuntu.com/manpages/focal/man8/fence_virsh.8.html
- Ubuntu manpage: `sbd`: https://manpages.ubuntu.com/manpages/noble/man8/sbd.8.html
- Pacemaker Explained: Fencing: https://clusterlabs.org/projects/pacemaker/doc/3.0/Pacemaker_Explained/html/fencing.html
- Pacemaker Explained: Cluster-wide configuration options: https://clusterlabs.org/projects/pacemaker/doc/2.1/Pacemaker_Explained/html/cluster-options.html
- Debian/Ubuntu pcs manpage references for `pcs stonith confirm`: https://manpages.debian.org/trixie/pcs/pcs.8.en.html

## Issues Found
- The post described `fence_sbd` as SCSI-based disk fencing and expanded SBD as "SCSI-Based Death." Official SBD documentation describes SBD as the STONITH Block Device mechanism using shared block storage and watchdog integration. Updated the terminology.
- The IPMI `pcs stonith create` examples used obsolete fence-agent parameter names (`ipaddr`, `login`, `passwd`). Updated them to the current names (`ip`, `username`, `password`) shown in Ubuntu fence-agent documentation and manpage metadata.
- The SBD example used `/dev/sdc` directly. Official SBD documentation recommends stable `/dev/disk/by-id/...` names for production. Updated the example to use a stable by-id path placeholder.
- The SBD setup enabled the service without starting it. Since SBD must be running on cluster nodes for Pacemaker to interact with it, updated the example to `systemctl enable --now sbd`.
- The `fence_virsh` resource example used the obsolete `login` parameter. Updated it to `username`, matching the fence-agent metadata.
- The testing section implied `pcs node unstandby node2` brings a fenced node online generally. That command only clears standby state. Updated the surrounding comment to make it conditional.

## Review Notes
The guide remains a high-level example. Production deployments should still verify the exact fence-agent package availability and parameters on the target Ubuntu release, test fencing in a non-production cluster, and tune SBD watchdog/msgwait and Pacemaker `stonith-timeout` values for the actual storage and watchdog behavior.
