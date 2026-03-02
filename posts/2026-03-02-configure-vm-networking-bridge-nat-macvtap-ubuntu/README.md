# How to Configure VM Networking (Bridge, NAT, Macvtap) on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, KVM, Networking, Virtualization

Description: Learn how to configure different KVM virtual machine networking modes on Ubuntu including NAT, bridge networking, and macvtap for various use cases.

---

KVM virtual machines can use several networking modes, each suited to different scenarios. NAT gives VMs internet access through the host. Bridge networking gives VMs a real presence on your LAN. Macvtap provides near-native performance without a traditional bridge. Understanding when to use each mode is essential for building a working virtualization infrastructure.

## Default NAT Networking

The `default` network created when you install libvirt uses NAT (Network Address Translation). VMs get private IP addresses from the `192.168.122.0/24` subnet and can reach the internet through the host, but are not directly reachable from the network.

```bash
# View the default NAT network configuration
virsh net-dumpxml default
```

This outputs something like:

```xml
<network>
  <name>default</name>
  <uuid>...</uuid>
  <forward mode='nat'>
    <nat>
      <port start='1024' end='65535'/>
    </nat>
  </forward>
  <bridge name='virbr0' stp='on' delay='0'/>
  <mac address='52:54:00:...'/>
  <ip address='192.168.122.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.122.2' end='192.168.122.254'/>
    </dhcp>
  </ip>
</network>
```

### Creating a Custom NAT Network

```bash
cat > /tmp/dev-network.xml << 'EOF'
<network>
  <name>dev-network</name>
  <forward mode='nat'/>
  <bridge name='virbr10' stp='on' delay='0'/>
  <ip address='10.10.10.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='10.10.10.100' end='10.10.10.200'/>
    </dhcp>
  </ip>
</network>
EOF

virsh net-define /tmp/dev-network.xml
virsh net-start dev-network
virsh net-autostart dev-network

virsh net-list
```

### Creating an Isolated Network (No External Access)

```bash
cat > /tmp/isolated.xml << 'EOF'
<network>
  <name>isolated</name>
  <bridge name='virbr20' stp='on' delay='0'/>
  <ip address='172.16.0.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='172.16.0.100' end='172.16.0.200'/>
    </dhcp>
  </ip>
</network>
EOF

virsh net-define /tmp/isolated.xml
virsh net-start isolated
virsh net-autostart isolated
```

## Bridge Networking

Bridge networking connects your VMs directly to your physical LAN. VMs get real IP addresses from your router's DHCP and are accessible from any device on the network.

### Setting Up a Network Bridge with Netplan

```bash
# Find your primary network interface
ip addr show
# Look for the interface with your LAN IP - typically enp3s0, eth0, or ens3

# Create netplan bridge configuration
sudo nano /etc/netplan/01-bridge.yaml
```

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:              # Your actual interface name
      dhcp4: false
      dhcp6: false
  bridges:
    br0:
      interfaces:
        - enp3s0
      dhcp4: true        # Get IP from your router
      parameters:
        stp: false       # Disable STP for simpler setups
        forward-delay: 0
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

For a static IP on the bridge:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
      dhcp6: false
  bridges:
    br0:
      interfaces:
        - enp3s0
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 192.168.1.1
          - 8.8.8.8
      parameters:
        stp: false
        forward-delay: 0
```

```bash
# Apply the configuration
sudo netplan apply

# Verify bridge is up
ip addr show br0
brctl show br0
```

### Creating a libvirt Network for the Bridge

```bash
cat > /tmp/br0-network.xml << 'EOF'
<network>
  <name>br0</name>
  <forward mode='bridge'/>
  <bridge name='br0'/>
</network>
EOF

virsh net-define /tmp/br0-network.xml
virsh net-start br0
virsh net-autostart br0
```

### Attaching a VM to the Bridge

```bash
# When creating a new VM
virt-install \
  --name bridged-vm \
  --memory 2048 \
  --vcpus 2 \
  --disk size=20 \
  --os-variant ubuntu22.04 \
  --network bridge=br0,model=virtio \
  --import

# Attach bridge network to existing VM
virsh attach-interface myvm \
  --type bridge \
  --source br0 \
  --model virtio \
  --persistent
```

## Macvtap Networking

Macvtap creates a virtual interface directly on the physical NIC, bypassing the kernel network stack. It offers better performance than traditional bridges and doesn't require creating a bridge device.

**Important limitation:** With macvtap, the VM can communicate with external hosts but cannot communicate with the host machine itself. If you need host-to-VM communication, use a bridge instead.

### Direct Macvtap Network in libvirt

```bash
cat > /tmp/macvtap-network.xml << 'EOF'
<network>
  <name>macvtap</name>
  <forward mode='bridge'>
    <interface dev='enp3s0'/>   <!-- Replace with your interface -->
  </forward>
</network>
EOF

virsh net-define /tmp/macvtap-network.xml
virsh net-start macvtap
virsh net-autostart macvtap
```

Alternatively, configure macvtap directly in the VM's XML:

```bash
# Edit VM XML directly
virsh edit myvm
```

Add this to the `<devices>` section:

```xml
<interface type='direct'>
  <source dev='enp3s0' mode='bridge'/>
  <model type='virtio'/>
</interface>
```

Macvtap modes:
- `bridge` - most compatible, VMs can talk to each other and external hosts
- `vepa` - traffic goes through external switch before coming back
- `private` - VMs cannot talk to each other
- `passthrough` - assigns the physical NIC to a single VM

## VLAN-Aware Networking

For environments with VLANs:

```bash
# Create VLAN interfaces on the host
sudo ip link add link enp3s0 name enp3s0.100 type vlan id 100
sudo ip link set enp3s0.100 up

# Create a bridge on the VLAN interface
sudo ip link add br-vlan100 type bridge
sudo ip link set enp3s0.100 master br-vlan100
sudo ip link set br-vlan100 up

# Make it persistent with netplan
sudo nano /etc/netplan/02-vlans.yaml
```

```yaml
network:
  version: 2
  vlans:
    vlan100:
      id: 100
      link: enp3s0
      dhcp4: false
  bridges:
    br-vlan100:
      interfaces:
        - vlan100
      dhcp4: true
      parameters:
        stp: false
        forward-delay: 0
```

## Configuring Static DHCP Leases

Assign fixed IP addresses to VMs by MAC address:

```bash
# Get the VM's MAC address
virsh domiflist myvm

# Edit the network to add a static lease
virsh net-edit default
```

Add inside the `<dhcp>` section:

```xml
<dhcp>
  <range start='192.168.122.100' end='192.168.122.200'/>
  <host mac='52:54:00:ab:cd:ef' name='myvm' ip='192.168.122.50'/>
</network>
```

```bash
# Apply changes
virsh net-destroy default
virsh net-start default
```

## Connecting VMs to Multiple Networks

VMs can have multiple network interfaces:

```bash
# Add a second NIC to an existing VM
virsh attach-interface myvm \
  --type network \
  --source isolated \
  --model virtio \
  --persistent
```

This is useful for firewall VMs that need interfaces on both the LAN and WAN, or database servers that have one interface on the application network and another on a management network.

## Troubleshooting VM Networking

```bash
# Check if the bridge exists and has interfaces
brctl show

# View iptables rules added by libvirt
sudo iptables -L FORWARD -n -v | grep virbr

# Check DHCP leases assigned by libvirt
sudo virsh net-dhcp-leases default

# Test connectivity from host to VM
ping 192.168.122.X

# Check if VM's network is visible from host
ip route show
```

**VM cannot reach internet through NAT:** Check that IP forwarding is enabled:

```bash
cat /proc/sys/net/ipv4/ip_forward
# Should be 1. If not:
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward
sudo sysctl -w net.ipv4.ip_forward=1
```

**Bridge networking not working:** Ensure the physical NIC is enslaved to the bridge and has no IP address of its own:

```bash
ip addr show enp3s0    # Should show no IP address
ip addr show br0       # Should show your LAN IP
brctl show br0         # Should list enp3s0 as a bridge port
```

Each networking mode serves a purpose. NAT works well for development VMs that just need internet access. Bridge networking is necessary for VMs that need to be reachable from the network as if they were physical machines. Macvtap offers performance advantages in high-throughput scenarios where you can accept the host-to-VM communication limitation.
