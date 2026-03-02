# How to Configure Network Bridges with Netplan on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, Netplan, Bridge, Virtualization

Description: Configure Linux network bridges with Netplan on Ubuntu for virtual machine networking, containers, and transparent network connectivity between segments.

---

A network bridge acts like a virtual switch, connecting multiple network interfaces so they can communicate as if they are on the same network segment. The primary use cases are:
- Giving VMs (KVM/QEMU) direct access to your physical network
- Connecting LXC containers to the host network
- Building a transparent network appliance that passes traffic between segments

Netplan makes bridge configuration declarative and straightforward.

## Why Use a Bridge for VMs

When you run KVM virtual machines on a server, you have choices for how those VMs access the network. NAT (the default in libvirt) is simple but puts VMs behind a separate network. A bridge lets VMs appear on the same network as the host, getting their own IP addresses from the same DHCP server and being directly reachable from other machines.

## Basic Bridge Configuration

Here is how to create a bridge (`br0`) that connects a physical interface (`enp3s0`) to the bridge network:

```yaml
# /etc/netplan/01-bridge.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    # Physical interface - becomes a bridge member, no direct IP
    enp3s0:
      dhcp4: false
  bridges:
    br0:
      interfaces:
        - enp3s0      # physical interface joins the bridge
      dhcp4: true     # the bridge gets the IP via DHCP
      parameters:
        stp: false    # disable spanning tree (fine for simple setups)
        forward-delay: 0  # no forwarding delay (faster startup)
```

Apply it:

```bash
# Test configuration
sudo netplan generate

# Apply with safety rollback period
sudo netplan try

# Confirm (press Enter if connectivity is working)
```

After applying, `enp3s0` will no longer have an IP address - `br0` will. Any VMs attached to `br0` will appear directly on your physical network.

## Bridge with Static IP

For server environments where you need predictable addressing:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
  bridges:
    br0:
      interfaces:
        - enp3s0
      dhcp4: false
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

## Bridge Parameters Explained

The bridge parameters control how the bridge behaves as a network switch:

```yaml
parameters:
  stp: true               # Spanning Tree Protocol - prevents loops
                          # Enable if you have multiple bridges or links
  forward-delay: 15       # seconds before ports enter forwarding state
                          # Set to 0 only if STP is disabled
  hello-time: 2           # STP hello interval in seconds
  max-age: 12             # maximum time to hold STP info
  ageing-time: 300        # how long to keep MAC address table entries
  priority: 32768         # STP bridge priority (lower = more likely to be root)
  path-cost: 100          # port cost for STP calculations
```

For a simple host with VMs and no risk of bridge loops:
```yaml
parameters:
  stp: false
  forward-delay: 0
```

For a setup with multiple bridges or redundant links:
```yaml
parameters:
  stp: true
  forward-delay: 4        # shorter delay requires rapid-STP capable switches
```

## Bridge Over a Bond

The most robust production configuration combines bonding for link redundancy with a bridge for VM connectivity:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
    enp4s0:
      dhcp4: false
  bonds:
    bond0:
      interfaces:
        - enp3s0
        - enp4s0
      parameters:
        mode: active-backup
        mii-monitor-interval: 100
  bridges:
    br0:
      interfaces:
        - bond0         # bridge sits on top of the bond
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
      parameters:
        stp: false
        forward-delay: 0
```

VMs on `br0` now benefit from the bond's redundancy.

## KVM/libvirt Integration

Once the bridge exists, you need to tell libvirt to use it. The quickest way is to define a network using the bridge:

```bash
# Create a libvirt network definition
cat << 'EOF' > /tmp/br0-network.xml
<network>
  <name>br0-network</name>
  <forward mode="bridge"/>
  <bridge name="br0"/>
</network>
EOF

# Define and start the network
sudo virsh net-define /tmp/br0-network.xml
sudo virsh net-start br0-network
sudo virsh net-autostart br0-network

# Verify
sudo virsh net-list
```

When creating a new VM, select `br0-network` as the network, and the VM will appear directly on your physical network segment.

## Checking Bridge Status

```bash
# List all bridges
bridge link show

# Show bridge and its members
ip link show type bridge

# Show bridge forwarding table (learned MAC addresses)
bridge fdb show br br0

# Show bridge statistics
ip -s link show br0

# Detailed bridge info
sudo networkctl status br0

# Check STP state (if STP enabled)
bridge stp show
```

## Troubleshooting Bridge Issues

**Host has no connectivity after creating bridge:**

```bash
# Verify br0 has an IP address
ip addr show br0

# Check if enp3s0 is properly a member of br0
bridge link show

# Check for conflicting IP on enp3s0
ip addr show enp3s0
# This should show NO IP address - the bridge member interface
# should not have its own IP

# Check routing
ip route show
```

**VMs cannot reach the network:**

```bash
# Check if br0 is up
ip link show br0

# Verify VM's tap interface is attached to br0
bridge link show

# Check that IP forwarding is enabled if needed
sysctl net.ipv4.ip_forward

# Check for firewall rules blocking bridge traffic
sudo iptables -L FORWARD -n -v
```

For KVM VMs, the tap interface (`vnet0`, `vnet1`, etc.) should appear in the bridge's forwarding table once the VM is running:

```bash
bridge fdb show br br0 | grep vnet
```

**Bridge not surviving reboot:**

```bash
# Verify Netplan file has correct syntax and is not overridden
sudo netplan generate

# Check if cloud-init is resetting networking
cat /etc/cloud/cloud.cfg.d/subiquity-disable-cloudinit-networking.cfg

# Disable cloud-init network management if needed
echo "network: {config: disabled}" | \
  sudo tee /etc/cloud/cloud.cfg.d/99-disable-network-config.cfg
```

## Container (LXC) Bridge Setup

For LXC containers, the setup is similar. After creating the bridge, configure your LXC container to use it:

```bash
# In your LXC container config (/etc/lxc/default.conf or container config)
lxc.net.0.type = veth
lxc.net.0.link = br0
lxc.net.0.flags = up
lxc.net.0.hwaddr = 00:16:3e:xx:xx:xx
```

The container's virtual interface automatically gets bridged to `br0` and shares the same network segment as the host.

## Multiple Bridges for Network Segmentation

You can have multiple bridges on one host for different network segments:

```yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    enp3s0:
      dhcp4: false
    enp4s0:
      dhcp4: false
  bridges:
    br-public:            # VMs on the public network
      interfaces:
        - enp3s0
      dhcp4: false
      addresses:
        - 203.0.113.10/24
      routes:
        - to: default
          via: 203.0.113.1
    br-internal:          # VMs on the internal network
      interfaces:
        - enp4s0
      dhcp4: false
      addresses:
        - 10.0.0.1/24
      parameters:
        stp: false
        forward-delay: 0
```

VMs can be attached to either bridge depending on whether they need public or internal-only network access.
