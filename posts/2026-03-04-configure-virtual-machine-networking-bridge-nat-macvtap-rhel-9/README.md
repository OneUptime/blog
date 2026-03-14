# How to Configure Virtual Machine Networking (Bridge, NAT, macvtap) on RHEL 9

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: RHEL, KVM, Networking, Bridge, NAT, Macvtap, Virtualization, Linux

Description: Learn how to configure bridge, NAT, and macvtap networking modes for KVM virtual machines on RHEL 9 with detailed setup instructions.

---

RHEL 9 provides three primary networking modes for KVM virtual machines: NAT for isolated environments with internet access, bridged for direct network participation, and macvtap for a lightweight bridge alternative. Each mode serves different use cases and has distinct advantages.

## NAT Networking

NAT networking is the default mode. VMs get private IP addresses and access external networks through the host's NAT.

### How It Works

- libvirt creates a virtual bridge (virbr0)
- VMs receive DHCP addresses from dnsmasq
- Outbound traffic is NAT-ed through the host
- External hosts cannot directly reach VMs (without port forwarding)

### Configuration

The default network XML:

```xml
<network>
  <name>default</name>
  <forward mode='nat'/>
  <bridge name='virbr0' stp='on' delay='0'/>
  <ip address='192.168.122.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.122.2' end='192.168.122.254'/>
    </dhcp>
  </ip>
</network>
```

### Port Forwarding to NAT VMs

Use iptables/nftables on the host:

```bash
sudo nft add rule ip nat prerouting tcp dport 8080 dnat to 192.168.122.50:80
```

Or use libvirt hooks for automatic port forwarding.

## Bridged Networking

Bridged networking connects VMs directly to the physical network. VMs appear as physical machines to other devices on the network.

### Creating a Bridge with NetworkManager

```bash
# Create bridge
sudo nmcli connection add type bridge ifname br0 con-name br0

# Add the physical interface as a slave
sudo nmcli connection add type bridge-slave ifname ens192 con-name br0-port1 master br0

# Configure IP (or use DHCP)
sudo nmcli connection modify br0 ipv4.addresses '192.168.1.10/24'
sudo nmcli connection modify br0 ipv4.gateway '192.168.1.1'
sudo nmcli connection modify br0 ipv4.dns '192.168.1.1'
sudo nmcli connection modify br0 ipv4.method manual

# Bring up
sudo nmcli connection up br0
```

### Using Bridge in VMs

```bash
sudo virt-install --network bridge=br0,model=virtio ...
```

Or in XML:

```xml
<interface type='bridge'>
  <source bridge='br0'/>
  <model type='virtio'/>
</interface>
```

### Advantages

- VMs get real network IPs
- Full network visibility and accessibility
- No NAT overhead
- Works with VLANs

### Disadvantages

- Requires bridge configuration on the host
- VMs consume IPs from the physical network
- Wireless interfaces cannot be bridged directly

## macvtap Networking

macvtap provides a lightweight alternative to bridging by creating virtual interfaces directly attached to a physical interface.

### Modes

- **vepa** - All traffic goes through the external switch
- **bridge** - VMs can communicate directly through the physical interface
- **private** - VMs are isolated from each other
- **passthru** - Exclusive use of the physical interface

### Configuration

```xml
<interface type='direct'>
  <source dev='ens192' mode='bridge'/>
  <model type='virtio'/>
</interface>
```

With virt-install:

```bash
sudo virt-install --network type=direct,source=ens192,source_mode=bridge,model=virtio ...
```

### Advantages

- No bridge configuration needed
- Simple setup
- Good performance

### Limitations

- VM cannot communicate with the host through macvtap (known limitation)
- Requires switch support for VEPA mode
- Not all network features work in all modes

### Workaround for Host-VM Communication

Add a second NAT interface for host-VM communication:

```xml
<interface type='direct'>
  <source dev='ens192' mode='bridge'/>
  <model type='virtio'/>
</interface>
<interface type='network'>
  <source network='default'/>
  <model type='virtio'/>
</interface>
```

## Choosing the Right Mode

| Requirement | Recommended Mode |
|------------|-----------------|
| Development/testing | NAT |
| Production servers | Bridge |
| Quick setup, no bridge config | macvtap |
| VM needs real IP | Bridge or macvtap |
| VM isolation | NAT or macvtap (private) |
| Host-VM communication | NAT or Bridge |

## Summary

RHEL 9 provides flexible VM networking through NAT, bridge, and macvtap modes. Use NAT for isolated development environments, bridged networking for production servers that need direct network access, and macvtap when you need direct network attachment without bridge configuration. Each mode has trade-offs between simplicity, performance, and functionality.
