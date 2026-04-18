# How to Use VXLAN for VM-to-VM Communication Across Hosts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, VM, KVM, Overlay, Linux, Cross-host Networking, IPv4, Bridge

Description: Learn how to set up VXLAN to enable Layer 2 connectivity between virtual machines running on different physical hosts, allowing VMs to communicate as if on the same local network.

---

VXLAN extends a VM's Layer 2 segment across multiple physical hosts. VMs on Host1 and Host2 can communicate via VXLAN as if they were on the same physical switch.

## Architecture

```text
Host1 (eth0: 10.0.0.1)              Host2 (eth0: 10.0.0.2)
  br-vm ──── tap0 (VM1)               br-vm ──── tap0 (VM1')
    |                                   |
  vxlan10                             vxlan10
    |                                   |
  eth0 ─────── UDP 4789 ────────────── eth0
```

## Step 1: Set Up VXLAN on Both Hosts

```bash
# On Host1:

ip link add vxlan10 type vxlan \
  id 10 dstport 4789 local 10.0.0.1 group 239.1.1.10 dev eth0
ip link set vxlan10 up

# On Host2:
ip link add vxlan10 type vxlan \
  id 10 dstport 4789 local 10.0.0.2 group 239.1.1.10 dev eth0
ip link set vxlan10 up
```

## Step 2: Create a Bridge and Attach VXLAN

```bash
# On both hosts:
ip link add br-vm type bridge
ip link set vxlan10 master br-vm
ip link set br-vm up
```

## Step 3: Create and Attach VM tap Interfaces

```bash
# Create a tap interface for a VM
ip tuntap add mode tap name tap0
ip link set tap0 master br-vm
ip link set tap0 up

# Start KVM VM with tap0
qemu-system-x86_64 \
  -netdev tap,id=net0,ifname=tap0,script=no,downscript=no \
  -device virtio-net-pci,netdev=net0 \
  ...
```

## Step 4: Assign IP to VMs

On VM1 (Host1):
```bash
ip addr add 192.168.100.10/24 dev eth0
ip route add default via 192.168.100.1
```

On VM1' (Host2):
```bash
ip addr add 192.168.100.11/24 dev eth0
ip route add default via 192.168.100.1
```

## Step 5: Verify VM-to-VM Connectivity

```bash
# From VM1 (192.168.100.10), ping VM1' (192.168.100.11)
ping 192.168.100.11

# Should work via VXLAN encapsulation

# Capture VXLAN traffic on Host1's physical interface
tcpdump -i eth0 -nn udp port 4789

# See inner VM MAC addresses with VXLAN decoding
tcpdump -i eth0 -nn -vv udp port 4789
```

## Adding a Router for Inter-VXLAN Routing

```bash
# If VMs on different VNIs need to communicate, add a router VM
# or assign an IP to the bridge interface and enable forwarding

# On Host1: assign gateway IP to the bridge
ip addr add 192.168.100.1/24 dev br-vm
sysctl -w net.ipv4.ip_forward=1
```

## Key Takeaways

- Attach VMs to the VXLAN bridge via tap interfaces; the bridge handles L2 forwarding across VTEPs.
- Use multicast (`group 239.1.1.10`) for automatic VTEP discovery; use static FDB entries for predictable behavior.
- VMs see a standard Ethernet interface; they have no awareness of the VXLAN overlay.
- Capture with `tcpdump -i eth0 udp port 4789` to inspect VXLAN encapsulated frames on the physical interface.
