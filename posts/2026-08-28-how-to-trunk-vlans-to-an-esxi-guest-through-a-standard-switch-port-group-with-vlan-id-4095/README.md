# How to Trunk VLANs to an ESXi Guest Through a Standard-Switch Port Group with VLAN ID 4095

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ESXi, vSphere, VLAN, VLAN Trunking, Standard Switch, Port Group, Virtual Guest Tagging, 802.1Q

Description: Pass selected 802.1Q VLANs to an ESXi guest through a vSphere Standard Switch port group configured for Virtual Guest Tagging with VLAN ID 4095.

---

On a vSphere Standard Switch, port-group VLAN ID `4095` is the special value for Virtual Guest Tagging (VGT). It does not mean VLAN 4095 is placed on the wire. It tells the standard switch to pass 802.1Q tags so that the guest operating system, virtual firewall, router, or nested workload handles them.

The physical switch must still trunk and allow the required VLANs, and the guest must create VLAN-aware interfaces. VLAN ID 4095 on an ESXi port group is not an access-control list: a standard switch cannot restrict the trunk to a selected range the way a vSphere Distributed Switch trunk policy can. Use a strict upstream allowlist and expose the port group only to trusted workloads.

## Plan the Trunk Without Risking Host Management

The example uses:

- standard switch `vSwitch1`;
- port group `Guest-Trunk`;
- physical uplink `vmnic2`;
- guest interface `ens192`;
- tagged VLANs 100 and 200.

Replace these names. Keep ESXi management, vMotion, vSAN, and IP storage on their existing, tested port groups. Do not change a management port group to VLAN ID 4095 as part of this procedure.

Before the change:

- confirm that every physical switch port connected to an active `vSwitch1` uplink is an IEEE 802.1Q trunk;
- allow only the VLAN IDs the guest genuinely needs;
- ensure the same VLANs and port-group configuration exist on every possible destination host;
- arrange console access to the guest in case its network configuration fails;
- record the standard-switch, port-group, uplink, and security policies;
- check whether the guest will use only its assigned vNIC MAC or bridge traffic for additional MAC addresses.

Standard-switch configuration is local to each ESXi host. vCenter does not automatically turn the identically named port group on another host into an identical trunk.

## Configure the Physical Switch First

Configure each upstream port connected to an active ESXi uplink as a dot1q trunk and allow the required VLANs, such as 100 and 200. Use the switch vendor's supported syntax and change-control procedure.

Do not copy a Cisco, Arista, HPE, or other vendor's sample syntax to a different switch family. Confirm:

- the port is Layer 2 and uses IEEE 802.1Q;
- VLANs 100 and 200 exist and are allowed;
- the native VLAN behavior is intentional;
- all members of any supported uplink design have the same VLAN allowlist;
- spanning-tree edge settings, where used, match the network standard.

Prefer tagged VLANs end to end. A native-VLAN mismatch can turn untagged traffic into a different network on each side and is difficult to diagnose from the guest.

## Create a Dedicated Standard-Switch Port Group

In the vSphere Client:

1. Select the ESXi host.
2. Open **Configure > Networking > Virtual switches**.
3. Select the intended standard switch, or use **Add Networking** to create a **Virtual Machine Port Group for a Standard Switch**.
4. Name the new port group `Guest-Trunk`.
5. Set **VLAN ID** to `4095`.
6. Save the configuration.

Create a dedicated trunk port group instead of converting a shared access port group. Every VM connected to a 4095 port group is expected to handle VLAN tags itself.

Attach one powered-off test VM's vNIC to `Guest-Trunk`, then power it on. Preserve the VM console or a second management vNIC while testing so a guest VLAN mistake does not remove all access.

## Choose Security Policies Deliberately

VLAN trunking alone does not automatically require promiscuous mode. A normal guest whose VLAN subinterfaces all use the vNIC's assigned MAC can often keep the standard switch's default security policy.

A virtual firewall, bridge, nested hypervisor, or container host may transmit or receive frames for additional MAC addresses. Broadcom's documented nested-container VGT workflow for a standard switch sets these port-group policies to **Accept**:

- Promiscuous Mode;
- MAC Address Changes;
- Forged Transmits.

Those settings broaden what the workload can observe or emit. Apply them only when the guest architecture requires them, at the dedicated port-group level, and after a security review. Do not relax the entire standard switch merely to troubleshoot one VM.

Broadly:

- **Promiscuous Mode** is relevant when the guest must receive frames not addressed to its effective vNIC MAC.
- **MAC Address Changes** permits a guest MAC change to affect inbound acceptance behavior.
- **Forged Transmits** permits outbound frames whose source MAC differs from the effective vNIC MAC.

Test with the restrictive defaults first for an ordinary VLAN-aware host. If a nested or bridging workload fails only for secondary MAC addresses, compare its requirement with the official Broadcom security-policy guidance before changing one setting at a time.

## Configure VLAN Interfaces in a Linux Guest

The guest owns the tags in VGT mode. The following Linux example creates temporary VLAN subinterfaces; use the guest distribution's supported network manager for persistent configuration.

First identify the actual parent interface:

```bash
ip link show
```

Then create VLAN 100 and VLAN 200 on `ens192`:

```bash
sudo ip link set ens192 up

sudo ip link add link ens192 name ens192.100 type vlan id 100
sudo ip address add 192.0.2.10/24 dev ens192.100
sudo ip link set ens192.100 up

sudo ip link add link ens192 name ens192.200 type vlan id 200
sudo ip address add 198.51.100.10/24 dev ens192.200
sudo ip link set ens192.200 up
```

Use addresses assigned by the network team. Do not configure duplicate addresses or add default routes on both VLANs without an intentional guest routing policy.

For Windows, BSD, a virtual appliance, or a nested platform, use that vendor's documented VLAN-trunking method. Some guest drivers or appliances expose VLAN configuration in their own UI rather than as OS subinterfaces.

## Verify Each Layer

Inside Linux, confirm the VLAN IDs and links:

```bash
ip -d link show ens192.100
ip -d link show ens192.200
ip address show ens192.100
ip address show ens192.200
```

Test a same-VLAN peer or gateway through each subinterface:

```bash
ping -I ens192.100 192.0.2.1
ping -I ens192.200 198.51.100.1
```

If available in the guest, a short capture can confirm whether tags are present:

```bash
sudo tcpdump -eni ens192 vlan
```

Verify the upstream switch learns the guest MAC on the expected VLANs and ESXi uplink. If one VLAN works and another does not, compare the physical trunk allowlist, VLAN existence, guest tag, addressing, and firewall rules. If no VLAN works, verify that the VM is attached to the 4095 port group and that the upstream port is a trunk rather than an access port.

## Migration and High-Availability Caveats

Before allowing vMotion or HA placement, reproduce and verify the standard-switch port group on every destination host. The name alone is insufficient; VLAN ID, uplinks, MTU, and security overrides must match.

Broadcom documents that after vMotion, VGT guests can temporarily lose connectivity because ESXi cannot identify the VLANs used inside the guest and therefore cannot send a RARP for those in-guest tagged networks. Traffic generated by the guest can refresh upstream MAC learning. Include active traffic verification in migration tests rather than assuming a successful vMotion task proves network continuity.

If the environment needs a centrally managed trunk with an explicit allowed VLAN range, use a vSphere Distributed Switch port group configured for VLAN Trunking instead of a 4095 standard-switch port group.

## Roll Back

Keep guest console access throughout rollback.

1. Remove the temporary guest VLAN interfaces:

   ```bash
   sudo ip link delete ens192.100
   sudo ip link delete ens192.200
   ```

2. Reconnect the VM to its original port group.
3. Restore any port-group security overrides to their recorded values.
4. Delete `Guest-Trunk` only after confirming no VM uses it.
5. Remove the physical-switch VLAN allowlist or trunk changes according to the network change plan.

Changing the port group from 4095 to an ordinary VLAN while a guest is still producing tagged frames does not convert the guest cleanly to access mode. Reconfigure both the guest and ESXi sides as one controlled rollback.

## Official Documentation

- [Configuring Virtual Guest VLAN tagging (VGT) mode](https://knowledge.broadcom.com/external/article/311291)
- [Sample configuration of virtual switch VLAN tagging](https://knowledge.broadcom.com/external/article/311540)
- [Virtual Switch Portgroup configuration for Virtual Machines running containers inside it](https://knowledge.broadcom.com/external/article/440372)
- [Network connectivity is lost for VMs with 802.1q VLAN tagging](https://knowledge.broadcom.com/external/article/317476)
- [vNetwork Distributed Switch configuration concepts](https://knowledge.broadcom.com/external/article/310573)

## Conclusion

VLAN ID 4095 on a vSphere Standard Switch port group enables Virtual Guest Tagging: ESXi passes dot1q tags and the guest owns the VLAN interfaces. Secure the design with an upstream VLAN allowlist, a dedicated port group, consistent configuration on every host, and only the security-policy exceptions the workload actually needs.
