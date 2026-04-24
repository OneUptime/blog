# How to Configure IPv6 in Proxmox VE

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Proxmox, Virtualization, KVM, LXC, Linux Bridge

Description: Configure IPv6 networking in Proxmox VE for host management, KVM virtual machines, and LXC containers, including bridge configuration, dual-stack setup, and SLAAC/DHCPv6 for guests.

## Introduction

Proxmox VE is a hypervisor platform that uses Linux bridges (vmbr0, vmbr1, etc.) for VM and container networking. IPv6 is configured on the bridge interfaces for dual-stack host and guest networking. KVM VMs receive IPv6 through their guest OS, while LXC containers can be configured with IPv6 directly in the Proxmox network configuration.

## Configure IPv6 on Proxmox Host Bridge

```bash
# /etc/network/interfaces - Proxmox host network configuration

auto lo
iface lo inet loopback

# Physical NIC

auto eth0
iface eth0 inet manual

# Main bridge (dual-stack)
auto vmbr0
iface vmbr0 inet static
    address 192.168.1.10/24
    gateway 192.168.1.1
    bridge-ports eth0
    bridge-stp off
    bridge-fd 0

# IPv6 on the same bridge
iface vmbr0 inet6 static
    address 2001:db8::10/64
    gateway 2001:db8::1

# Separate bridge for VM-only IPv6 traffic
auto vmbr1
iface vmbr1 inet6 static
    address fd00:100::1/64
    bridge-ports none
    bridge-stp off
    bridge-fd 0
```

```bash
# Apply manual changes without reboot (recommended)
ifreload -a
# Or reboot the node to apply the new configuration:
reboot
```

## Configure IPv6 in Proxmox Web UI

```text
1. Node → System → Network
2. Click "Edit" on vmbr0
3. Add IPv6 Address: 2001:db8::10/64
4. Add IPv6 Gateway: 2001:db8::1
5. Click "OK"
6. Click "Apply Configuration"
```

## KVM VM IPv6 Configuration

```bash
# In Proxmox: attach the VM to vmbr0
# The bridge provides the VM access to the IPv6 network
# If the guest uses cloud-init, Proxmox can inject IPv4/IPv6 settings
# Replace your-storage with a storage that supports image volumes
# This example assumes the guest OS disk is already attached as scsi0

qm set 101 --net0 virtio,bridge=vmbr0
qm set 101 --ide2 your-storage:cloudinit
qm set 101 --boot order=scsi0
qm set 101 --ipconfig0 ip=192.168.1.100/24,gw=192.168.1.1,ip6=2001:db8::100/64,gw6=2001:db8::1

# Start VM
qm start 101
```

## LXC Container IPv6 Configuration

```bash
# Create LXC container with IPv6
# Replace VERSION with the exact template build available on your host
pct create 102 local:vztmpl/ubuntu-22.04-standard_VERSION_amd64.tar.zst \
    --hostname mycontainer \
    --memory 512 \
    --net0 name=eth0,bridge=vmbr0,ip=192.168.1.101/24,gw=192.168.1.1,ip6=2001:db8::101/64,gw6=2001:db8::1

# Start container
pct start 102

# Check container's network
pct exec 102 -- ip -6 addr show

# Modify IPv6 of existing container
pct set 102 --net0 name=eth0,bridge=vmbr0,ip=192.168.1.101/24,gw=192.168.1.1,ip6=2001:db8::101/64,gw6=2001:db8::1
```

## Enable IPv6 Forwarding on Proxmox Host

```bash
# Needed only if the Proxmox host routes IPv6 between bridges or subnets
# /etc/sysctl.d/99-proxmox-ipv6.conf
net.ipv6.conf.all.forwarding = 1

# If the uplink bridge must still learn routes via RA, also set:
net.ipv6.conf.vmbr0.accept_ra = 2

# Apply
sysctl -p /etc/sysctl.d/99-proxmox-ipv6.conf
```

## SLAAC for VMs and Containers

```bash
# If you want VMs and containers to receive SLAAC from a router
# The Proxmox bridge forwards Router Advertisements to guests

# Check RAs are being forwarded through the bridge
tcpdump -i vmbr0 -n "icmp6 and icmp6[0] == 134"
# Type 134 = Router Advertisement

# If running a local radvd for VMs (ULA prefix)
# /etc/radvd.conf
cat > /etc/radvd.conf << 'EOF'
interface vmbr1 {
    AdvSendAdvert on;
    MinRtrAdvInterval 3;
    MaxRtrAdvInterval 10;
    prefix fd00:100::/64 {
        AdvOnLink on;
        AdvAutonomous on;
    };
};
EOF

systemctl enable --now radvd
```

## IPv6 Firewall for Proxmox

```bash
# Proxmox uses its own firewall (pve-firewall)
# Configure via Web UI: Datacenter → Firewall → Add rule

# Or via CLI (/etc/pve/firewall/cluster.fw):
# [RULES]
# IN ACCEPT -source 2001:db8::/32 -proto tcp -dport 22
# IN ACCEPT -proto icmpv6

# Keep NDP enabled so Neighbor Discovery and SLAAC continue to work
# Proxmox Web UI: Datacenter → Firewall → Options → NDP = Yes
```

## Verify IPv6 in Proxmox

```bash
# Check host bridge has IPv6
ip -6 addr show vmbr0

# Check IPv6 routing
ip -6 route show

# Test IPv6 connectivity from host
ping -6 2001:4860:4860::8888

# Check VM/container IPv6
qm guest exec 101 ip -6 addr show       # KVM VM (requires guest agent)
pct exec 102 -- ip -6 addr show         # LXC container

# Proxmox API: list VM network interfaces including IPv6
pvesh get /nodes/your-node/qemu/101/agent/network-get-interfaces
```

## Conclusion

Proxmox VE configures IPv6 through Linux bridge interfaces (`vmbr*`) in `/etc/network/interfaces` with `iface vmbr0 inet6 static` stanzas, or via the Proxmox Web UI Network configuration. KVM VMs receive IPv6 through their bridge attachment and guest OS configuration; with cloud-init, Proxmox can inject IPv6 settings via the `ip6=` and `gw6=` parameters. LXC containers configure IPv6 directly through the `pct create` or `pct set` `--net0 ip6=` parameter. Enable `net.ipv6.conf.all.forwarding=1` on the Proxmox host only when it routes IPv6 between bridges or subnets, and run radvd on guest-only bridges to provide SLAAC for guests.
