# How to Configure Virtual Machine Networking with libvirt on RHEL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: RHEL, KVM, Networking, Libvirt, Bridge, NAT, Virtualization, Linux

Description: Learn how to configure virtual machine networking with libvirt on RHEL, including NAT, bridged, and isolated network configurations.

---

libvirt manages virtual networks for KVM guests on RHEL. The default configuration provides a NAT network, but you can create bridged, isolated, and routed networks depending on your requirements.

## Viewing Current Networks

```bash
# List all virtual networks
sudo virsh net-list --all

# Show details of the default network
sudo virsh net-info default

# View the XML configuration
sudo virsh net-dumpxml default
```

## The Default NAT Network

The default network provides NAT-based connectivity:

```bash
# Start the default network if not running
sudo virsh net-start default
sudo virsh net-autostart default

# Default network uses:
# - Bridge: virbr0
# - Subnet: 192.168.122.0/24
# - DHCP: 192.168.122.2 to 192.168.122.254
# - Gateway: 192.168.122.1
```

## Creating a Custom NAT Network

```bash
# Define a new NAT network
cat << 'EOF' > /tmp/custom-nat.xml
<network>
  <name>custom-nat</name>
  <forward mode='nat'>
    <nat>
      <port start='1024' end='65535'/>
    </nat>
  </forward>
  <bridge name='virbr1' stp='on' delay='0'/>
  <ip address='10.10.10.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='10.10.10.100' end='10.10.10.200'/>
    </dhcp>
  </ip>
</network>
EOF

sudo virsh net-define /tmp/custom-nat.xml
sudo virsh net-start custom-nat
sudo virsh net-autostart custom-nat
```

## Creating an Isolated Network

An isolated network has no connectivity to the host or external network:

```bash
cat << 'EOF' > /tmp/isolated-net.xml
<network>
  <name>isolated</name>
  <bridge name='virbr2' stp='on' delay='0'/>
  <ip address='172.16.0.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='172.16.0.100' end='172.16.0.200'/>
    </dhcp>
  </ip>
</network>
EOF

sudo virsh net-define /tmp/isolated-net.xml
sudo virsh net-start isolated
```

## Attaching a VM to a Network

```bash
# Attach a network interface to a running VM
sudo virsh attach-interface rhel9-vm network default --model virtio --live --config

# Detach a network interface
sudo virsh detach-interface rhel9-vm network --mac 52:54:00:xx:xx:xx --live --config
```

## Setting Static DHCP Reservations

```bash
# Assign a fixed IP to a VM based on MAC address
sudo virsh net-update default add ip-dhcp-host \
  "<host mac='52:54:00:ab:cd:ef' ip='192.168.122.50'/>" --live --config

# Verify the reservation
sudo virsh net-dumpxml default | grep -A1 "host mac"
```

## Troubleshooting Network Issues

```bash
# Check if the bridge interface is up
ip link show virbr0

# Check DHCP leases
sudo virsh net-dhcp-leases default

# Check iptables rules for NAT
sudo iptables -t nat -L -n | grep virbr
```

Choose NAT networks for VMs that only need outbound internet access. Use bridged networks when VMs need to be directly accessible on the physical network. Use isolated networks for testing environments that should have no external connectivity.
