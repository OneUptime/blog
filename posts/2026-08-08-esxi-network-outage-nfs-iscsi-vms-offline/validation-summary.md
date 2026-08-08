# Validation Summary: Why a Brief Network Outage Can Take ESXi VMs Offline on NFS or iSCSI

## Status
validated

## Post Type
Technical Troubleshooting Guide

## Technologies Covered
- VMware ESXi and vCenter Server
- vSphere High Availability and VM Component Protection (VMCP)
- Network File System (NFS 3 and NFS 4.1)
- Software iSCSI and VMFS
- All Paths Down (APD) and Permanent Device Loss (PDL)
- VMkernel networking, TCP/IP stacks, vSwitches, and vSphere Distributed Switches
- SCSI multipathing and storage-path recovery
- Ethernet storage networks, VLANs, LACP, MTU, and jumbo frames

## Sources Consulted
- [Broadcom KB 318712: Permanent Device Loss (PDL) and All-Paths-Down (APD) on host](https://knowledge.broadcom.com/external/article/318712/permanent-device-loss-pdl-and-allpathsdo.html)
- [Broadcom KB 318938: ESXi hosts in APD condition may appear as Not Responding](https://knowledge.broadcom.com/external/article/318938/esxi-hosts-in-all-paths-down-apd-conditi.html)
- [Broadcom KB 324862: Behavior of vSphere HA VM Component Protection APD policies](https://knowledge.broadcom.com/external/article/324862/behavior-of-vsphere-ha-vm-component-prot.html)
- [Broadcom KB 425582: VMCP events do not trigger when intermittent APD clears](https://knowledge.broadcom.com/external/article/425582/vsphere-ha-component-protection-events-d.html)
- [Broadcom KB 414574: Delay for failure response for Datastore with APD](https://knowledge.broadcom.com/external/article/414574/delay-for-failure-response-setting-for-d.html)
- [Broadcom KB 427204: Per-VM APD overrides can prevent HA restart](https://knowledge.broadcom.com/external/article/427204/virtual-machines-fail-to-restart-via-vsp.html)
- [Broadcom vSphere API: VM Component Protection settings](https://developer.broadcom.com/xapis/vsphere-web-services-api/latest/vim.cluster.VmComponentProtectionSettings.html)
- [Broadcom KB 440803: Troubleshooting network access from ESXi to an NFS datastore](https://knowledge.broadcom.com/external/article/440803/troubleshooting-network-access-from-esxi.html)
- [Broadcom KB 323107: Troubleshooting NFS datastore connectivity issues](https://knowledge.broadcom.com/external/article/323107/troubleshooting-nfs-datastore-connectivi.html)
- [Broadcom KB 380337: NFS VMkernel port binding support and version requirements](https://knowledge.broadcom.com/external/article/380337/nfs-41-datastores-using-custom-nfs-tcpip.html)
- [Broadcom KB 305042: NFS 4.1 VM failure after APD lock loss](https://knowledge.broadcom.com/external/article/305042/virtual-machines-on-an-nfs-41-datastore.html)
- [RFC 8881: Network File System Version 4 Minor Version 1 Protocol](https://www.rfc-editor.org/rfc/rfc8881.html)
- [Broadcom KB 317719: Considerations for software iSCSI port binding](https://knowledge.broadcom.com/external/article/317719/considerations-for-using-software-iscsi.html)
- [Broadcom KB 440474: iSCSI APD caused by a duplicate IP address](https://knowledge.broadcom.com/external/article/440474/iscsi-all-paths-down-apd-and-h0x1-noconn.html)
- [Broadcom KB 344313: Testing VMkernel network connectivity with vmkping](https://knowledge.broadcom.com/external/article/344313/testing-vmkernel-network-connectivity-wi.html)
- [Broadcom ESXCLI network command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_network.html)
- [Broadcom ESXCLI storage command reference](https://developer.broadcom.com/xapis/esxcli-command-reference/latest/namespace/esxcli_storage.html)
- [Broadcom KB 344470: Remounting a disconnected NFS datastore](https://knowledge.broadcom.com/external/article/344470/remounting-a-disconnected-nfs-datastore.html)
- [Broadcom KB 320280: Restarting management agents in ESXi](https://knowledge.broadcom.com/external/article/320280/restarting-the-management-agents-in-esxi.html)

## Issues Found
1. **Software iSCSI port binding was presented as universal.** The data-path diagram said that every software iSCSI session uses a bound storage VMkernel, and the troubleshooting text always instructed readers to verify binding. Port binding is topology-dependent and should not be used in several supported routed or separate-subnet designs. The diagram now says that the VMkernel is selected by routing or iSCSI port binding, and the troubleshooting step checks route selection and binding where applicable.
2. **NFS routing was presented as the only VMkernel-selection mechanism.** Routing controls ordinary unbound NFS traffic, but supported ESXi 8 releases also provide datastore-level NFS VMkernel binding. The post now qualifies the routing statement and identifies the minimum support levels: ESXi 8.0 Update 1 for NFS 3 and ESXi 8.0 Update 3 for NFS 4.1.
3. **The route and `vmkping` examples silently assumed the default TCP/IP stack.** The route command defaults to the default netstack, and `vmkping` does the same unless a stack is selected. The post now instructs readers with a non-default storage stack to use `-N <netstack>` for the route listing and `-S <netstack>` for `vmkping`.
4. **The SCSI HBA rescan was presented as if it also recovered NFS mounts.** `esxcli storage core adapter rescan --all` is valid and current, but it rescans SCSI HBAs and is appropriate for iSCSI/VMFS paths; it does not remount a disconnected NFS datastore. The command is now scoped to iSCSI/VMFS, with NFS recovery directed to the documented NFS remount procedure when a mount remains disconnected.
5. **The PDL definition was not explicitly scoped to SCSI-backed storage.** PDL detection through supported SCSI sense information applies to storage such as iSCSI, while an NFS accessibility failure is reported as APD. The definition now states that scope.
6. **VMCP behavior was described as depending only on cluster policy, and the UI path was incomplete.** Per-VM HA overrides can replace cluster APD/PDL behavior, and disabled Host Monitoring or VM Restart Priority prevents VMCP from restarting a VM. The post now includes these requirements, directs readers to VM Overrides, and gives the complete Failures and Responses path for APD and PDL settings.
7. **The APD failure-response timing was oversimplified.** On vSphere 8.0, the default 140-second ESXi APD timeout elapses before the default three-minute VMCP failure-response delay begins. The post now explains both timers and notes that a separately configured response-on-clear action can reset a still-powered-on VM after a timed-out APD clears.

## Review Notes
- All six external links in the post resolve to the intended Broadcom knowledge-base articles.
- All remaining ESXCLI and shell commands are current and syntactically valid. The `8972`-byte `vmkping` payload is correct for the IPv4 example on an MTU-9000 path, and `nc -vz <server> 2049` is valid ESXi syntax for a TCP reachability test.
- A successful TCP 2049 check proves only transport reachability to the NFS service. NFS 3 environments can also depend on rpcbind and mountd, and export authorization must still be validated; the post does not overstate the port test.
- Broadcom KB 305042 lists ESXi 6.x in its environment, but RFC 8881 independently confirms the underlying NFS 4.1 lease, state-revocation, and lock-loss mechanism. Exact UI and VM power-state behavior should still be checked for the deployed ESXi and array versions.
- Broadcom KB 324862 lists vSphere 6.5 through 7.0, while the current vSphere API and vSphere 8-specific KBs corroborate the APD policy and timing behavior used in the corrected post.
