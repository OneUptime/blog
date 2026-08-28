# How to Move an ESXi Management VMkernel Adapter from a Distributed Switch to a Standard Switch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VMware, ESXi, vSphere, VMkernel, Distributed Switch, Standard Switch, Networking

Description: Move an ESXi management VMkernel adapter from a vSphere Distributed Switch to a Standard Switch while preserving a tested recovery path.

---

Moving the management VMkernel adapter is not an ordinary port-group change. It moves the path that vCenter Server uses to manage the host, so a VLAN, MTU, teaming, or physical-switch mismatch can disconnect the host midway through the operation.

The safest supported workflow is staged: keep one working uplink on the distributed switch, prepare an equivalent Standard Switch path with another uplink, migrate only the management VMkernel adapter, verify it, and then decide whether to move anything else. Broadcom's migration guidance also recommends leaving management on a Standard Switch when the design permits because it provides a useful recovery path.

This guide applies to vSphere Standard Switches (vSS) and vSphere Distributed Switches (vDS) managed by vCenter Server. Do not use it for an NSX N-VDS or an NSX-managed VMkernel adapter. LACP/LAG, iSCSI port binding, vSAN, and unusual routed VMkernel designs require their product-specific procedures.

## Prerequisites and Safety Checks

Schedule a maintenance window and, where practical, evacuate or power down workloads on the host. Before changing networking:

- Confirm working out-of-band console access through iLO, iDRAC, KVM, or equivalent. Do not treat an SSH session over the management VMkernel as a recovery path.
- Back up the vSphere Distributed Switch configuration.
- Verify that the vDS has at least two physical uplinks capable of carrying management traffic. The staged online workflow is not safe with a single management uplink.
- Record the management adapter name, IP mode, address, prefix/netmask, TCP/IP stack, default gateway, MTU, VLAN, enabled services, distributed port group, uplinks, and teaming policy.
- Confirm that the physical switch port for the destination uplink carries the management VLAN and matches the required MTU.
- Check whether the vDS uplinks participate in a LAG. A vSS cannot participate in a vDS LAG, and the upstream LACP configuration normally has to be changed before taking a member out of the LAG.

Capture a local record from the ESXi Shell or SSH while connectivity is healthy:

```bash
esxcfg-vswitch -l
esxcli network ip interface list
esxcli network ip interface ipv4 get
esxcli network ip route ipv4 list
```

Also take screenshots of **Host > Configure > Networking > VMkernel adapters** and **Virtual switches**. If the management adapter is not `vmk0`, use its actual name throughout the verification steps.

## Build the Destination Standard Switch

In the vSphere Client, select the ESXi host and open **Configure > Networking > Virtual switches**.

1. Add a new Standard Switch. Initially create it without moving the management adapter.
2. Create a Standard Switch port group for management traffic.
3. Set the port group's VLAN ID to the management VLAN. Use VLAN `0` only when frames are intentionally untagged on the ESXi side.
4. Match the required switch MTU and review the port-group security and teaming settings.

Do not assume that identical port-group names imply identical networking. A vSS port group is host-local, and its VLAN, failover order, and security policy must be configured on that host.

## Move One Physical Uplink First

The existing vDS must retain a working uplink while the new vSS gains one.

1. Under the vDS on the host, select **Manage Physical Adapters**.
2. Remove one `vmnic` from its distributed uplink, leaving the other management-capable uplink attached and active.
3. Under the new vSS, select **Manage Physical Adapters** and add the released `vmnic`.
4. Recheck the upstream switch configuration, VLAN, link state, MTU, and failover order.

Broadcom notes that removing one uplink can cause brief packet loss while traffic fails over. Stop here if the remaining vDS uplink does not preserve connectivity or if the destination uplink is not operational.

LACP is a special case. If the original uplinks are members of a vDS LAG, coordinate with the physical-network team before removing a member. Do not attach a still-LACP-configured physical link to an ordinary vSS teaming policy and hope that it will converge.

## Migrate the Management VMkernel Adapter

From **Host > Configure > Networking > Virtual switches**, locate the new Standard Switch, open its actions menu, and choose **Migrate VMkernel Adapters**.

1. Select the recorded management VMkernel adapter.
2. Choose the prepared management port group on the vSS.
3. Review the change and finish the wizard.

The migration moves the existing VMkernel adapter; it does not require deleting and recreating its IP configuration. Expect a short interruption. Keep the out-of-band console open and watch both the vCenter task and host console.

Do not simultaneously migrate unrelated vMotion, vSAN, provisioning, replication, NFS, or iSCSI VMkernel adapters. Validating one service boundary at a time makes both failure isolation and rollback much safer.

## Verify the New Management Path

First confirm in the vSphere Client that the host returns to **Connected** and that the management VMkernel adapter now appears under the vSS port group. Then verify locally:

```bash
esxcfg-vswitch -l
esxcli network ip interface list
esxcli network ip interface ipv4 get
esxcli network ip route ipv4 list
vmkping -I vmk0 <management-default-gateway>
vmkping -I vmk0 <vcenter-server-ip>
```

Replace `vmk0` with the actual management interface. A successful ping is necessary but not sufficient. Confirm that:

- vCenter can reconnect to and manage the host;
- DNS resolves the host's FQDN consistently in both directions;
- the host's management agents remain responsive;
- the destination uplink and physical switch port show no unexpected drops or VLAN errors;
- HA and other cluster agents recover normally, if enabled.

Test failover only if the vSS has two correctly configured physical uplinks. Do not remove the last known-good link merely to prove redundancy during the same change window.

## Complete the Migration Deliberately

If the objective is only to put management on a vSS, leave other VMkernel adapters and VM networks on the vDS. There is no requirement to empty the vDS.

If the entire host must leave the vDS, migrate each remaining VMkernel adapter and every powered-on, powered-off, and template VM NIC to equivalent vSS port groups. Only after the vDS has no consumers should you move its remaining uplinks and remove the host from the distributed switch.

## Rollback and Recovery

If the vSphere Client reports that the network change disconnected the host and automatically rolls it back, investigate the full path before retrying. Broadcom identifies VLAN, MTU, physical-switch, and teaming mismatches as common causes of network rollback.

If vCenter connectivity is lost but the host console remains available, use the captured configuration to restore a management-capable Standard Switch path. Broadcom documents CLI recovery commands, but this is disruptive because the management VMkernel adapter may have to be removed and recreated. Follow the exact Broadcom KB procedure for the host version and topology rather than improvising `esxcfg-vswitch` flags.

The DCUI **Restore Standard Switch** option is a last-resort recovery action, not a routine rollback button. Broadcom warns that it removes existing vSwitch, port-group, and VMkernel information before creating a minimal standard-switch configuration. Use it only with console access, a complete configuration record, and an understood rebuild plan.

## Limitations and Version Scope

The vSphere Client labels and menu locations can vary slightly between vCenter 7.x and 8.x. The staged topology and safety constraints remain the same. This procedure does not cover NSX-managed ports, vDS LAG migration, iSCSI port binding, a single-NIC host, or a host whose management path depends on a non-default TCP/IP stack. Escalate those designs to the relevant Broadcom procedure or Support.

## Official Documentation

- [Migrate VMs and VMkernel adapters from a vDS to a vSS (Broadcom KB 306406)](https://knowledge.broadcom.com/external/article/306406/migrate-virtual-machines-vms-and-vmkerne.html)
- [Migrate ESXi host networking from vDS to vSS by CLI (Broadcom KB 376245)](https://knowledge.broadcom.com/external/article/376245/moving-host-from-dvs-to-standard-switch.html)
- [Configure a Standard or Distributed Switch from the ESXi command line (Broadcom KB 326175)](https://knowledge.broadcom.com/external/article/326175/configuring-standard-vswitch-vss-or-virt.html)
- [Create a vSphere Standard Switch](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/7-0/vsphere-networking-7-0/setting-up-networking-with-vnetwork-standard-switches/create-a-vsphere-standard-switch.html)
- [LACP support on a vSphere Distributed Switch](https://techdocs.broadcom.com/us/en/vmware-cis/vsphere/vsphere/7-0/vsphere-networking-7-0/configuring-lacp-on-a-vsphere-distrubuted-switch-in-the-vsphere-web-client.html)
- [Network rollback after a management-network change (Broadcom KB 415012)](https://knowledge.broadcom.com/external/article/415012)

## Conclusion

A safe management migration always preserves a known-good path: prepare the vSS, move one redundant uplink, migrate the existing VMkernel adapter, and verify management end to end before touching anything else. Out-of-band access and an accurate configuration record turn a risky network cutover into a recoverable operation.
