# How to Understand ARP in Virtualized Environments (VMware, KVM)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, ARP, VMware, KVM, Virtualization

Description: Learn how ARP works in virtual machine environments including VMware vSphere and KVM/libvirt, covering virtual switches, promiscuous mode, and live migration.

## ARP in Virtual Networking

Virtualization platforms create virtual switches (vSwitches) that bridge VMs to the physical network. ARP works similarly to physical networks but with some important considerations.

## VMware vSphere ARP Behavior

### Virtual Switch (vSwitch) Security Settings

VMware vSwitch has security policies that affect ARP:

| Policy | Default (vSphere 7.0+) | ARP Impact |
|--------|---------|-----------|
| Promiscuous Mode | Reject | VMs cannot sniff frames not addressed to them, though ARP broadcasts still arrive normally |
| MAC Address Changes | Reject | If a guest changes its effective MAC, inbound traffic to that new MAC can be dropped |
| Forged Transmits | Reject | Outbound frames, including ARP, are dropped if the source MAC does not match the vNIC's effective MAC |

On older vSphere 6.x environments, `MAC Address Changes` and `Forged Transmits` were commonly `Accept` by default.

```text
When "Forged Transmits = Reject":
- vSwitch drops outbound frames, including ARP, where source MAC ≠ VM's effective MAC
- Prevents MAC spoofing from inside VMs
```

### Configuring VMware Security Policies

In vSphere Client or via PowerCLI:

```powershell
# PowerCLI: Set security policy on a vSwitch

Get-VirtualSwitch -Name "vSwitch0" | 
    Get-SecurityPolicy | 
    Set-SecurityPolicy -ForgedTransmits $false -MacChanges $false
```

### ARP During vMotion (Live Migration)

When a VM migrates from one host to another via vMotion:

1. The VM's MAC address becomes active on the destination host
2. If `Notify Switches` is enabled, ESXi sends **RARP** on behalf of the VM
3. Upstream physical switches relearn the VM's location in their MAC tables
4. Traffic flows to the new host

This is typically transparent to the VM when upstream switches relearn the MAC promptly.

## KVM/libvirt ARP Behavior

### Linux Bridge (Default libvirt Network)

On many libvirt hosts, the default `virbr0` network is a Linux bridge used for NAT. Guests on that network still share a broadcast domain with each other:

```bash
# View the bridge device
ip -details link show dev virbr0

# View interfaces attached to the bridge
ip link show master virbr0

# Show neighbor table entries for the bridge
ip neigh show dev virbr0

# Guests on the same bridge still ARP directly to each other
```

### Check VM ARP Traffic

```bash
# Capture ARP on the bridge interface
sudo tcpdump -n -e -i virbr0 arp

# Capture on a specific VM's tap interface
sudo tcpdump -n -e -i vnet0 arp
```

### MACVTAP Mode

In MACVTAP mode, guest traffic bypasses a Linux bridge and appears directly connected to the physical network:

```bash
# List VM network interfaces and MAC addresses
virsh domiflist vm-name

# Show host-side macvtap devices
ip link show type macvtap
```

### ARP After VM Migration (KVM)

After a KVM live migration, some environments rely on an unsolicited ARP from the guest to refresh neighbor caches:

```bash
# Inside the VM after migration
arping -U -c 3 -I eth0 192.168.1.100
```

## ARP and Promiscuous Mode

For host-side packet capture or bridge-based appliances, promiscuous mode allows an interface to receive frames not addressed to its own MAC:

```bash
# Enable promiscuous mode on a Linux bridge interface
ip link set dev virbr0 promisc on

# Verify
ip link show dev virbr0 | grep PROMISC
```

## Common ARP Issues in Virtualized Environments

| Issue | Cause | Fix |
|-------|-------|-----|
| VM loses connectivity after guest MAC change | vSwitch rejects MAC changes or forged transmits | Allow the required security policies on that port group |
| Connectivity after vMotion fails | Upstream switch did not relearn the VM MAC from RARP | Check `Notify Switches` and upstream switch MAC learning |
| Stale ARP after failover | Peers still cache the old IP-to-MAC mapping | Clear neighbor cache or send unsolicited ARP |
| Containers in VM can't ARP | Double NAT or bridge isolation | Check container bridge settings |

## Key Takeaways

- VMware vSwitch security policies directly affect whether guests can send or receive traffic after MAC changes.
- VMware uses RARP, not gratuitous ARP, for switch notification after vMotion when `Notify Switches` is enabled.
- The default libvirt `virbr0` network is NAT-backed, but guests on it still ARP directly with each other.
- In some KVM environments, sending an unsolicited ARP from the guest after live migration helps refresh neighbor caches.

**Related Reading:**

- [How to Understand Gratuitous ARP and Its Uses](https://oneuptime.com/blog/post/2026-03-20-gratuitous-arp-uses/view)
- [How to Understand ARP in VLAN Environments](https://oneuptime.com/blog/post/2026-03-20-arp-in-vlan-environments/view)
- [How to Debug ARP Issues in Kubernetes Clusters](https://oneuptime.com/blog/post/2026-03-20-debug-arp-kubernetes/view)
