# Why a Brief Network Outage Can Take ESXi VMs Offline on NFS or iSCSI

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, NFS, iSCSI, APD, VMCP, Storage Network, High Availability

Description: Explain and troubleshoot how a short storage-network interruption becomes blocked guest I/O, APD, lost NFS locks, or a VMCP recovery event.

---

When VM storage is carried over Ethernet, a network interruption is also a disk interruption. The VM's virtual NIC can remain connected while its VMDK becomes unreachable. Guest reads and writes block, management agents wait on storage, and the VM can appear hung, inaccessible, or powered off even after ordinary network pings recover.

The outcome depends on protocol, outage duration, array behavior, multipathing, NFS lock state, guest timeouts, and vSphere HA VM Component Protection settings. A short physical event can therefore have a longer application impact.

## Follow the Actual Data Path

For NFS, the path is approximately:

```text
VM I/O -> ESXi NFS client -> storage VMkernel -> port group
-> vSwitch or vDS -> vmnic -> physical fabric -> NFS server/export
```

For software iSCSI:

```text
VM I/O -> VMFS -> SCSI multipathing -> iSCSI adapter/session
-> bound storage VMkernel -> port group -> uplink -> target portal -> LUN
```

A successful ping from a guest, management workstation, or `vmk0` does not validate the storage path. The storage VMkernel can use another VLAN, route, uplink, MTU, or switch fabric.

## Understand APD and PDL

**All Paths Down**, or APD, means ESXi has no working path and cannot tell whether the device loss is temporary or permanent. It continues retrying I/O. Broadcom documents that both guest I/O and management-agent I/O can wait, making VMs unresponsive and the host appear disconnected from vCenter.

**Permanent Device Loss**, or PDL, means the array returns supported sense information that tells ESXi the device is permanently unavailable. ESXi can stop indefinite retries and vSphere HA can apply its configured PDL response.

A network outage more commonly produces APD because the host receives no authoritative storage response. Do not label every inaccessible datastore PDL or detach a device as if it will never return.

## Why Recovery Can Outlast the Outage

Several timers and states must recover:

- physical links, LAGs, spanning-tree state, VLAN forwarding, and routing;
- ARP or neighbor entries;
- iSCSI TCP sessions, discovery, login, and SCSI paths;
- NFS TCP sessions and server-side client state;
- queued guest and host I/O;
- VMFS locks or NFS locking state; and
- vCenter and host-agent inventory.

NFS 4.1 adds a specific hazard. Broadcom documents that after an APD and the server's grace period, the server can flush client state. When access returns, a VM may report that the lock protecting its VMDK was lost. That VM must not simply resume as if ownership were unchanged; ensure HA did not start another copy before acknowledging the condition.

For iSCSI, all configured paths can share an unnoticed failure domain. Two VMkernel ports on the same VLAN, switch, uplink ASIC, or target controller do not provide the independence their path count suggests.

## Determine Scope Before Acting

Ask:

- one VM, one datastore, one host, or the entire cluster;
- NFS only, iSCSI only, or all storage traffic;
- one VLAN or one physical switch;
- one target portal, array controller, or export;
- one host while peers retain access; and
- APD start and clear events or an ongoing outage.

Preserve exact timestamps from monitoring, switches, array, vCenter Tasks and Events, `/var/run/log/vobd.log`, and `/var/run/log/vmkernel.log`. Broadcom APD events include datastore or device identifiers that can be mapped back to the affected storage.

Do not reboot the host before collecting this evidence unless an outage decision requires it. Rebooting every host can destroy the last working access path and create simultaneous VM outages.

## Test the Storage VMkernel Path

List VMkernel interfaces and routes:

```bash
esxcli network ip interface ipv4 get
esxcli network ip route ipv4 list
```

Test the target from the actual storage VMkernel:

```bash
vmkping -I vmk2 192.0.2.40
```

For a configured 9000-byte path, validate non-fragmenting payload across the entire route with the payload size appropriate to the environment:

```bash
vmkping -I vmk2 -d -s 8972 192.0.2.40
```

Do not use jumbo parameters on a 1500-byte design. A standard ping can succeed while large storage traffic fails because MTU is inconsistent.

For NFS, inspect the host route because ESXi selects a VMkernel according to its routing table; there is no NFS service checkbox that overrides routing. Check the NFS server service and export configuration, and verify TCP 2049 reachability when the official NFS procedure calls for it:

```bash
nc -vz 192.0.2.40 2049
```

For iSCSI, verify VMkernel binding, target portal reachability, discovery sessions, CHAP where used, and the physical switch path. Compare with a healthy host instead of deleting and recreating the adapter.

## Verify Virtual and Physical Network State

Check uplinks and switches:

```bash
esxcli network nic list
esxcli network vswitch standard list
esxcli network vswitch dvs vmware list
```

Correlate each storage VMkernel with its port group, VLAN, teaming policy, active uplink, physical switch port, and allowed VLAN. Review link-flap, CRC, discard, LACP, port-channel, spanning-tree, and MLAG events on the physical network.

A single-host failure often indicates a vmnic, VLAN allow-list, LAG member, VMkernel binding, duplicate IP, or driver-firmware issue. Broadcom documents duplicate VMkernel IPs as a source of iSCSI ARP thrashing and repeated APD.

## Restore Storage Before Management Cosmetics

Fix the failed link, switch, route, target service, export, controller, or array condition first. Confirm sustained VMkernel connectivity and healthy target service. Then use the vSphere Client storage rescan or the documented CLI action:

```bash
esxcli storage core adapter rescan --all
```

Verify iSCSI paths return active or NFS mounts become accessible, and confirm APD clear events. Avoid repeated cluster-wide rescans while the network remains broken.

Restarting `hostd` or `vpxa` can refresh management after storage has recovered, but it does not repair the data path. Broadcom warns that management-agent restarts can disrupt tasks and should be limited to individual services, especially with vSAN, LACP, or NSX.

A controlled host reboot is a last recovery step for residual APD references or hung kernel workers. Evacuate unaffected VMs where possible, gracefully shut down those that cannot migrate, collect logs, and use out-of-band console access. A hard reboot is an outage for every VM still on the host.

## Understand VMCP Behavior

vSphere HA VM Component Protection can respond to APD and PDL, but only according to cluster policy. For APD, **Disabled** and **Issue Events** do not alter the VM. Other policies can power off and restart affected VMs after configured timing and conditions.

Broadcom documents that if an intermittent APD clears within **Delay for failure response**, VMCP does not trigger a restart. That is expected and avoids unnecessary recovery for a brief event. It also means VMCP is not proof that a flapping storage path is harmless.

Review **Cluster > Configure > vSphere Availability > Datastore with APD** and the PDL policy. Validate admission capacity and datastore accessibility from potential restart hosts. Do not change VMCP policy in the middle of an outage without understanding whether another VM copy can access the same disks.

## Validate Every Affected VM

After storage returns:

- ensure only one instance of each VM is running;
- check Tasks and Events for lock-loss, HA restart, and power-off reasons;
- validate guest filesystem and database recovery according to application policy;
- inspect snapshot and consolidation state;
- confirm no backup task was interrupted with a disk still attached to a proxy; and
- test application transactions, not only ICMP.

A guest may need filesystem or database recovery after I/O timeouts even when ESXi reports the datastore healthy. Treat application consistency separately from infrastructure reachability.

## Design Out the Shared Failure Domain

For iSCSI, use independent physical fabrics, uplinks, VMkernel ports, target ports, and array controllers according to the vendor's supported multipathing design. For NFS, use supported NIC teaming or NFS 4.1 multipathing as documented by the storage vendor and vSphere, with redundant server interfaces and switches.

Monitor packet loss, switch errors, storage latency, path state, APD events, NFS availability, and target sessions. Test failure of one real component during a maintenance exercise rather than assuming two configured paths are independent.

## Official Documentation

- [Permanent Device Loss and All-Paths-Down on an ESXi host](https://knowledge.broadcom.com/external/article/318712/permanent-device-loss-pdl-and-allpathsdo.html)
- [Behavior of vSphere HA VM Component Protection APD policies](https://knowledge.broadcom.com/external/article/324862/behavior-of-vsphere-ha-vm-component-prot.html)
- [VMCP events do not trigger when intermittent APD clears](https://knowledge.broadcom.com/external/article/425582/vsphere-ha-component-protection-events-d.html)
- [Troubleshooting network access from ESXi to an NFS datastore](https://knowledge.broadcom.com/external/article/440803/troubleshooting-network-access-from-esxi.html)
- [NFS 4.1 VM failure after APD lock loss](https://knowledge.broadcom.com/external/article/305042/virtual-machines-on-an-nfs-41-datastore.html)
- [iSCSI APD caused by a duplicate IP address](https://knowledge.broadcom.com/external/article/440474/iscsi-all-paths-down-apd-and-h0x1-noconn.html)

## Conclusion

A storage-network outage blocks disk I/O, not merely connectivity. Trace the real storage VMkernel path, distinguish APD from PDL, restore the fabric or target before refreshing management, and account for NFS lock state and VMCP timing. Infrastructure recovery is complete only after each guest and application proves its data is consistent.
