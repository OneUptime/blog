# How to Configure Virtual Machine Networking (Bridge, NAT, macvtap) on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Networking, Bridge, NAT, Macvtap, Virtualization, Linux

Description: Learn how to configure different virtual machine networking modes on RHEL, including bridged, NAT, and macvtap, to match your connectivity requirements.

---

RHEL supports multiple networking modes for KVM virtual machines. Each mode has different use cases depending on whether VMs need direct network access, isolation, or something in between.

## NAT Networking (Default)

NAT mode gives VMs outbound internet access through the host. VMs are not directly reachable from the external network.

```bash
# The default NAT network is already configured
sudo virsh net-list

# VMs on the default network get IPs from 192.168.122.0/24
# The host acts as router and NAT gateway

# Create a VM using NAT
sudo virt-install \
  --name nat-vm \
  --memory 2048 --vcpus 2 \
  --disk size=20 \
  --network network=default,model=virtio \
  --cdrom /var/lib/libvirt/images/rhel-9.4-dvd.iso \
  --os-variant rhel9.4 --graphics vnc
```

## Bridged Networking

Bridged mode connects VMs directly to the physical network. VMs get IP addresses from the same DHCP server as physical machines.

```bash
# Create a bridge interface using nmcli
# Replace ens3 with your physical interface name
sudo nmcli connection add type bridge con-name br0 ifname br0

# Add the physical interface as a bridge port
sudo nmcli connection add type bridge-slave con-name br0-port1 \
  ifname ens3 master br0

# Configure IP settings on the bridge
sudo nmcli connection modify br0 ipv4.method auto
sudo nmcli connection up br0

# Verify the bridge
ip addr show br0
bridge link show
```

Define the bridge in libvirt:

```bash
# Create a libvirt network using the host bridge
cat << 'EOF' > /tmp/bridge-net.xml
<network>
  <name>host-bridge</name>
  <forward mode="bridge"/>
  <bridge name="br0"/>
</network>
EOF

sudo virsh net-define /tmp/bridge-net.xml
sudo virsh net-start host-bridge
sudo virsh net-autostart host-bridge

# Attach a VM to the bridged network
sudo virsh attach-interface rhel9-vm network host-bridge --model virtio --config
```

## macvtap Networking

macvtap connects VMs directly to the physical interface without creating a bridge. It is simpler to set up but VMs cannot communicate with the host through macvtap.

```bash
# Create a VM with macvtap (direct mode)
sudo virt-install \
  --name macvtap-vm \
  --memory 2048 --vcpus 2 \
  --disk size=20 \
  --network type=direct,source=ens3,model=virtio,source_mode=bridge \
  --cdrom /var/lib/libvirt/images/rhel-9.4-dvd.iso \
  --os-variant rhel9.4 --graphics vnc

# macvtap modes:
# bridge - VMs can talk to each other and external network
# vepa   - traffic between VMs goes through external switch
# private - VMs are isolated from each other
```

## Comparing the Three Modes

```bash
# NAT: VM -> virbr0 -> iptables NAT -> physical NIC -> network
# Best for: development, testing, workstations

# Bridge: VM -> br0 (includes physical NIC) -> network
# Best for: servers that need direct network access

# macvtap: VM -> macvtap interface -> physical NIC -> network
# Best for: simple setups, no host-to-VM communication needed
```

## Troubleshooting

```bash
# Check bridge configuration
bridge link show
ip addr show br0

# Check NAT rules
sudo iptables -t nat -L -n

# Check macvtap interfaces
ip link show | grep macvtap
```

Choose bridged networking when VMs need to be first-class network citizens. Use NAT for isolated environments. Use macvtap when you want direct network access without the overhead of maintaining a bridge configuration.
