# ESXi VM Has No Network: Trace the vNIC to the Physical Switch

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, VM Networking, Virtual NIC, Port Group, VLAN, Virtual Switch, Packet Capture

Description: Isolate an ESXi VM network outage hop by hop across the guest, virtual adapter, port group, vSwitch, uplink, VLAN, and physical fabric.

---

A VM's network path crosses several independently configured layers. A green virtual NIC icon proves only that the virtual device is connected to a backing. It does not prove that the guest configured the interface, the port group uses the correct VLAN, the selected uplink carries that VLAN, or the physical switch forwards it.

Troubleshoot from the VM outward and compare each failing hop with a working peer. Changing VLANs, drivers, and switch policies together destroys the evidence needed to locate the drop.

## Classify Scope First

The fastest branch comes from scope:

- **one VM only:** guest IP, vNIC state, duplicate address, guest firewall, or VM-specific port;
- **one port group:** VLAN or distributed-port-group policy;
- **one ESXi host:** standard-switch drift, uplink mapping, cable, driver, or physical switch port;
- **one uplink:** vmnic, optic, switch member, or VLAN allow-list;
- **all VMs on a host:** host uplinks, switch, resource or storage issue; and
- **after vMotion:** destination host port-group parity, uplink VLAN, or physical MAC learning.

Test a working VM on the same host and port group, another VM on the same VLAN but a different host, and the default gateway. Two VMs on the same standard switch and VLAN can communicate without traversing the physical uplink, so same-host success does not validate the external path.

Record the affected VM, vNIC MAC, guest IP and prefix, gateway, DNS, port group, VLAN, host, vSwitch or vDS, active uplink, and physical switch port.

## Verify the Guest Without Assuming ESXi Is at Fault

Open the VM console. If the console is also frozen, investigate storage or resource contention before networking. In a responsive guest, verify:

- interface is up and has the expected MAC;
- IP address and subnet mask are correct;
- default route points to the right gateway;
- no duplicate IP or stale static configuration exists;
- local firewall permits the test; and
- VMware Tools and the paravirtual NIC driver are healthy.

Test in increasing distance: loopback, the VM's own IP, a same-subnet peer, gateway, remote IP, then DNS name. An IP connection that works while name resolution fails is a DNS issue, not a vSwitch failure.

If the VM was converted or restored, check for a hidden old guest adapter retaining the static IP. If the virtual NIC type changed, install the supported guest driver before removing the only working adapter.

## Verify the Virtual Adapter and Backing

In **VM > Edit Settings**, confirm:

- the intended Network Adapter exists;
- **Connected** and **Connect at power on** are selected;
- its MAC matches the guest and network records;
- it connects to the correct VM port group, not a VMkernel port group; and
- the backing exists on the current host.

Do not repeatedly disconnect and reconnect a production vNIC before capturing state. That can clear symptoms and creates an application-visible link flap.

For vSphere Standard Switches, port groups are configured independently on each host. Identical names do not guarantee identical VLAN IDs or teaming. Broadcom documents loss after vMotion when a port group is absent or differs on one host. Compare the destination host with a working host field by field.

For a vSphere Distributed Switch, check host membership, uplink assignment, distributed port state, blocked ports, and port-group overrides. Do not migrate vCenter networking away from a vDS through improvised recovery actions; use the documented vCenter-on-vDS procedure.

## Validate VLAN Mode End to End

In ordinary Virtual Switch Tagging, the VM port group has a VLAN ID and the physical uplink is a trunk that permits that VLAN. With a physical access or native VLAN, the port group uses VLAN 0 or None and the switch assigns the untagged frame.

Common mismatches are:

- port group tags VLAN 120 but switch port is access VLAN 120 and drops tagged frames;
- switch port is a trunk but VLAN 120 is missing from its allow-list;
- one member of a host's uplink team lacks the VLAN;
- native VLAN differs across the link; and
- the same standard port-group name maps to another VLAN on one host.

Check both directions. A capture can show outbound frames correctly tagged while inbound replies arrive untagged and are dropped as `VlanTag Mismatch`.

## Trace the Uplink Selected for the VM

Check physical adapters:

```bash
esxcli network nic list
```

Use `esxtop`, press `n`, and identify the VM's virtual port, team uplink, and packet counters. Broadcom uses this workflow to determine which vmnic currently carries a VM or VMkernel.

Review teaming at both vSwitch and port-group levels. If load balancing is **Route based on originating virtual port**, isolate one uplink at a time through the supported UI. For IP hash, the physical ports must form the matching static port channel. LACP belongs on a supported vSphere Distributed Switch design.

Compare physical port configuration, link errors, MAC learning, spanning-tree state, port security, storm control, and VLAN membership. A VM that fails only when mapped to one vmnic normally points below the virtual port group.

## Use a Two-Point Packet Capture

Broadcom's `pktcap-uw` tool can observe frames near the VM's switch port and at the physical uplink. Find the switch port:

```bash
net-stats -l
```

Capture a short, filtered test at the VM port and uplink. Broadcom documents these capture points:

```bash
pktcap-uw --switchport 123456 --capture VnicTx,VnicRx -o - |
  tcpdump-uw -r - -enn
```

```bash
pktcap-uw --uplink vmnic2 --capture UplinkSndKernel,UplinkRcvKernel -o - |
  tcpdump-uw -r - -enn
```

Stop each capture with Ctrl+C after the test. Substitute the actual switch-port ID and uplink. Add a specific MAC, IP, and protocol filter using the official syntax to reduce load.

Interpret the four directions:

| Observation | Likely boundary |
| --- | --- |
| Guest sends but no VnicTx | guest driver or virtual adapter path |
| VnicTx exists but no uplink send | port group, VLAN, teaming, or vSwitch |
| Uplink send exists but no uplink receive | physical network, gateway, or destination |
| Uplink receive exists but no VnicRx | VLAN mismatch, vSwitch policy, or wrong destination port |
| VnicRx exists but guest does not answer | guest IP stack or firewall |

Packet capture is a debugging tool, not continuous monitoring. Broadcom warns that unfiltered or multiple long sessions can consume resources. Do not save captures to `/tmp`; use a healthy persistent datastore and protect them because they can contain sensitive traffic.

## Check MTU and Advanced Policies Last

If small traffic succeeds but larger transfers fail, validate MTU end to end. Guest vNIC, VM port group, vSwitch, vmnic, physical switch, and routed path must agree. Do not enable jumbo frames only on ESXi to fix an external mismatch.

Review vSwitch security policies when the workload legitimately changes source MACs, uses nested virtualization, load balancers, clustering, or packet capture. **Forged transmits**, **MAC address changes**, and **promiscuous mode** should remain at secure defaults unless the workload design requires an exception. Do not enable all three as a generic connectivity test.

For NSX-backed networks, add segment, logical port, transport-node, TEP, tunnel, and distributed-firewall checks. A standard-vSwitch fix does not apply automatically to an overlay path.

## Apply the Smallest Fix

Correct the proven boundary:

- guest address, route, firewall, or driver;
- VM vNIC connection or port-group selection;
- missing or inconsistent standard port group;
- VLAN ID or physical trunk allow-list;
- active or standby uplink assignment;
- port-channel or LACP mismatch;
- failed cable, optic, vmnic, or switch port; or
- upstream routing, security, or destination service.

After each change, repeat the same packet and application test. Avoid treating ping alone as success when the outage affected TCP, load balancing, or application sessions.

## Validate Across Failure Paths

Move a noncritical canary VM or use a maintenance window to test every host that can run the workload. Fail each uplink individually and verify connectivity. Confirm the same port-group name, VLAN, MTU, security, and teaming across all standard-switch hosts, or enforce consistency with a distributed switch where appropriate.

Preserve a support bundle and the captures if the drop remains inside ESXi after configuration parity is proven.

## Official Documentation

- [Troubleshooting virtual machine network connection issues](https://knowledge.broadcom.com/external/article/324542/troubleshooting-virtual-machine-network.html)
- [Troubleshooting VLAN connectivity issues](https://knowledge.broadcom.com/external/article/375097/troubleshooting-vlan-connectivity-on-esx.html)
- [Port-group mismatch across ESXi hosts](https://knowledge.broadcom.com/external/article/431907/port-group-mismatch-across-esxi-hosts-re.html)
- [VMs on one ESXi host lose network connectivity](https://knowledge.broadcom.com/external/article/419915/vms-on-esxi-hosts-lose-network-connectiv.html)
- [Packet capture on ESXi using pktcap-uw](https://knowledge.broadcom.com/external/article/341568/packet-capture-on-esxi-using-the-pktcapu.html)
- [VLAN tag mismatch shown in pktcap-uw](https://knowledge.broadcom.com/external/article/429983/vm-network-connectivity-fails-with-vlant.html)

## Conclusion

Trace a failed VM network in order: guest, vNIC, port group, virtual switch, selected vmnic, physical port, VLAN, and destination. A two-point capture shows where the frame disappears. Fix that boundary, then test every host and uplink that can carry the VM so the next vMotion or failover does not recreate the outage.
