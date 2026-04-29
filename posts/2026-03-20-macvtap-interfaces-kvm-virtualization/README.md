# How to Configure macvtap Interfaces for KVM Virtualization

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Macvtap, KVM, Virtualization, Linux, Virtual Machine, Macvlan, Networking, IPv4

Description: Learn how to configure macvtap interfaces for KVM virtual machines as an alternative to bridge networking, providing direct Layer 2 access to the physical network without a bridge.

---

macvtap combines macvlan and tap into a single interface, giving VMs a direct connection to the physical network. Unlike bridge networking, macvtap doesn't require bridge creation, but the host cannot communicate with VMs directly over the same lower interface.

## macvtap vs. Bridge Networking

| Feature | macvtap | Bridge |
|---------|---------|--------|
| Setup complexity | Simpler | More complex |
| Host-to-VM communication | Not on same lower interface | Yes |
| Performance | Slightly better | Good |
| VLAN support | Mode-dependent | Yes |
| Multiple VMs | Multiple macvtap | One bridge |

## macvtap Modes

- **bridge**: VMs can communicate with each other and the physical network.
- **private**: VMs on the same lower interface cannot communicate directly with each other.
- **vepa**: Traffic between VMs on the same host goes out to the external network and back (requires a hairpin-capable switch or external router).
- **passthru**: A single endpoint gets exclusive access on the lower interface, allowing guest MAC, promiscuous mode, and VLAN changes.

## Creating a macvtap Interface Manually

```bash
# Create macvtap in bridge mode on eth0

ip link add link eth0 name macvtap0 type macvtap mode bridge

# Assign a MAC to the macvtap interface (VM's MAC address)
ip link set macvtap0 address aa:bb:cc:dd:ee:01

# Bring it up
ip link set macvtap0 up

# The /dev/tapX file is created automatically
ls -l /dev/tap*
# crw-rw---- 1 root kvm 252, 0 /dev/tap0
```

## Using macvtap in QEMU/KVM

```bash
# Get the tap device number
TAPNUM=$(cat /sys/class/net/macvtap0/ifindex)

# Launch VM with macvtap
qemu-system-x86_64 \
  -netdev tap,fd=3,id=net0,vhost=on \
  -device virtio-net-pci,netdev=net0,mac=aa:bb:cc:dd:ee:01 \
  3<>/dev/tap${TAPNUM} \
  ...
```

## Using macvtap in libvirt XML

```xml
<interface type='direct'>
  <source dev='eth0' mode='bridge'/>
  <mac address='aa:bb:cc:dd:ee:01'/>
  <model type='virtio'/>
</interface>
```

## Verifying macvtap

```bash
# Show macvtap interface details
ip -d link show macvtap0
# Output includes: macvtap mode bridge  numtxqueues 1 numrxqueues 1

# Show associated tap device number
cat /sys/class/net/macvtap0/ifindex

# Show the corresponding device node and sysfs link
ls -l /dev/tap$(cat /sys/class/net/macvtap0/ifindex)
ls -l /sys/class/net/macvtap0/tap*
```

## Key Takeaways

- macvtap creates a tap character device (`/dev/tapX`) that QEMU/KVM reads directly, bypassing the bridge.
- Use `mode bridge` for most VM deployments; this allows VM-to-VM and VM-to-network communication.
- The host cannot communicate with macvtap VMs on the same physical interface - use a separate management NIC or bridge for host-to-VM connectivity.
- libvirt automates macvtap creation with `<interface type='direct'>` and handles tap device management.
