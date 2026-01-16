# How to Configure VLANs on Ubuntu

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, VLANs, Networking, Linux, Network Administration, Netplan, Docker, Network Segmentation

Description: A comprehensive guide to configuring VLANs on Ubuntu, covering Netplan, ifupdown, inter-VLAN routing, Docker integration, and troubleshooting.

---

Network segmentation is fundamental to building secure, scalable infrastructure. VLANs (Virtual Local Area Networks) let you logically divide a physical network into isolated broadcast domains without additional hardware. This guide covers everything you need to configure VLANs on Ubuntu.

## What Are VLANs and Why Use Them?

A VLAN is a logical subdivision of a Layer 2 network. Devices on the same VLAN can communicate as if they were on the same physical switch, even if they're connected to different switches across a building or data center.

### Benefits of VLANs

- **Security isolation**: Separate sensitive systems (databases, management interfaces) from general traffic
- **Broadcast domain reduction**: Limit broadcast traffic to improve performance
- **Traffic organization**: Group devices by function, department, or security level
- **Simplified management**: Move devices between networks without rewiring
- **Cost efficiency**: Use one physical interface for multiple logical networks

### Common VLAN Use Cases

```
VLAN 10  - Management network (switches, routers, IPMI)
VLAN 20  - Production servers
VLAN 30  - Development/staging
VLAN 40  - Storage network (iSCSI, NFS)
VLAN 50  - Guest/IoT devices
VLAN 100 - DMZ (public-facing services)
```

## Prerequisites

Before configuring VLANs on Ubuntu, ensure you have the following.

### Hardware Requirements

Your network switch must support 802.1Q VLAN tagging. Consumer-grade switches typically don't support VLANs. You need a managed switch from vendors like:

- Cisco (Catalyst, Nexus)
- Juniper
- Arista
- Dell PowerSwitch
- HP/Aruba
- Ubiquiti (EdgeSwitch, UniFi)
- MikroTik

### Switch Port Configuration

The switch port connected to your Ubuntu server must be configured as either a trunk port (carries multiple VLANs) or an access port (single VLAN, untagged).

Example Cisco trunk port configuration:

```
interface GigabitEthernet0/1
  switchport mode trunk
  switchport trunk allowed vlan 10,20,30,40
  switchport trunk native vlan 1
```

### Verify Your Setup

Check that your network interface is up and connected.

```bash
# List network interfaces
ip link show

# Check interface status
ip -br link show
```

## Installing VLAN Support

Ubuntu requires the `vlan` package to handle 802.1Q tagged frames.

Install the VLAN package and verify the 8021q kernel module is loaded.

```bash
# Install the vlan package
sudo apt update
sudo apt install vlan

# Load the 8021q kernel module
sudo modprobe 8021q

# Verify the module is loaded
lsmod | grep 8021q
```

Make the kernel module load automatically at boot.

```bash
# Add 8021q to /etc/modules for persistence
echo "8021q" | sudo tee -a /etc/modules
```

## Netplan VLAN Configuration

Modern Ubuntu (17.10+) uses Netplan for network configuration. This is the recommended approach.

### Basic VLAN Configuration

Create a VLAN interface on your physical interface. This example creates VLAN 20 on eth0 with a static IP.

```yaml
# /etc/netplan/01-vlan-config.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
      # The physical interface can remain unconfigured
      # or have its own IP on the native/untagged VLAN
  vlans:
    vlan20:
      id: 20
      link: eth0
      addresses:
        - 192.168.20.10/24
      routes:
        - to: default
          via: 192.168.20.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

Apply the configuration with Netplan.

```bash
# Test the configuration first (auto-reverts after 120 seconds if connectivity is lost)
sudo netplan try

# Apply the configuration permanently
sudo netplan apply

# Verify the VLAN interface was created
ip addr show vlan20
```

### VLAN with DHCP

If your VLAN has a DHCP server, use dynamic addressing.

```yaml
# /etc/netplan/01-vlan-dhcp.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  vlans:
    vlan30:
      id: 30
      link: eth0
      dhcp4: true
      dhcp4-overrides:
        use-dns: true
        use-routes: true
```

### Physical Interface with IP Plus VLANs

You can assign an IP to the physical interface (native VLAN) while also having tagged VLANs.

```yaml
# /etc/netplan/01-native-plus-vlans.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - 192.168.1.10/24  # Native VLAN (untagged)
      routes:
        - to: default
          via: 192.168.1.1
  vlans:
    vlan20:
      id: 20
      link: eth0
      addresses:
        - 192.168.20.10/24
    vlan30:
      id: 30
      link: eth0
      addresses:
        - 192.168.30.10/24
```

## ifupdown VLAN Configuration (Legacy)

For older Ubuntu systems or those preferring ifupdown, use the `/etc/network/interfaces` file.

### Install ifupdown

If not already installed, add the ifupdown package.

```bash
sudo apt install ifupdown
```

### Basic VLAN with ifupdown

Configure VLAN interfaces in the interfaces file. The interface name format is `parentinterface.vlanid`.

```bash
# /etc/network/interfaces

# Loopback interface
auto lo
iface lo inet loopback

# Physical interface (can be left unconfigured or given native VLAN IP)
auto eth0
iface eth0 inet manual

# VLAN 20 interface
auto eth0.20
iface eth0.20 inet static
    address 192.168.20.10
    netmask 255.255.255.0
    gateway 192.168.20.1
    dns-nameservers 8.8.8.8 8.8.4.4
    vlan-raw-device eth0

# VLAN 30 interface with DHCP
auto eth0.30
iface eth0.30 inet dhcp
    vlan-raw-device eth0
```

Bring up the interfaces.

```bash
# Bring up specific VLAN interface
sudo ifup eth0.20

# Or restart networking
sudo systemctl restart networking

# Verify
ip addr show eth0.20
```

### Alternative VLAN Naming Convention

You can use descriptive names instead of `eth0.20` format.

```bash
# /etc/network/interfaces

auto vlan20
iface vlan20 inet static
    address 192.168.20.10
    netmask 255.255.255.0
    gateway 192.168.20.1
    vlan-raw-device eth0
```

## Multiple VLANs on Single Interface

A common scenario is a server that needs access to multiple network segments. Here's a complete example with four VLANs.

This configuration creates a trunk port setup where one physical interface handles management, production, storage, and backup networks.

```yaml
# /etc/netplan/01-multi-vlan.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eno1:
      dhcp4: false
      mtu: 9000  # Jumbo frames for storage network
  vlans:
    # Management VLAN
    mgmt:
      id: 10
      link: eno1
      addresses:
        - 10.10.10.50/24
      routes:
        - to: default
          via: 10.10.10.1
      nameservers:
        addresses: [10.10.10.2, 10.10.10.3]
        search: [mgmt.example.com]

    # Production VLAN
    prod:
      id: 20
      link: eno1
      addresses:
        - 10.20.0.50/24
      routes:
        - to: 10.20.0.0/16
          via: 10.20.0.1

    # Storage VLAN (jumbo frames)
    storage:
      id: 40
      link: eno1
      mtu: 9000
      addresses:
        - 10.40.0.50/24
      routes:
        - to: 10.40.0.0/24
          via: 10.40.0.1

    # Backup VLAN
    backup:
      id: 50
      link: eno1
      addresses:
        - 10.50.0.50/24
```

Apply and verify all VLAN interfaces.

```bash
sudo netplan apply

# List all interfaces
ip -br addr show

# You should see:
# eno1       UP
# mgmt@eno1  UP  10.10.10.50/24
# prod@eno1  UP  10.20.0.50/24
# storage@eno1 UP 10.40.0.50/24
# backup@eno1 UP 10.50.0.50/24
```

## VLAN Tagging and Trunk Ports

Understanding how VLAN tagging works helps with troubleshooting.

### 802.1Q Frame Format

When a frame is tagged, a 4-byte VLAN header is inserted after the source MAC address.

```
+------------------+------------------+------+------+------+
| Dest MAC (6B)    | Src MAC (6B)     | TPID | TCI  | Type |
+------------------+------------------+------+------+------+
                                       |      |
                                       |      +-- VLAN ID (12 bits)
                                       |          Priority (3 bits)
                                       |          CFI (1 bit)
                                       |
                                       +-- Always 0x8100 for 802.1Q
```

### Verify VLAN Tagging

Use tcpdump to see tagged frames on the wire.

```bash
# Capture on physical interface to see VLAN tags
sudo tcpdump -i eth0 -nn -e vlan

# Example output:
# 10:23:45.123456 aa:bb:cc:dd:ee:ff > 11:22:33:44:55:66, ethertype 802.1Q (0x8100), vlan 20, p 0, ethertype IPv4, 192.168.20.10 > 192.168.20.1: ICMP echo request
```

### Check VLAN Configuration on Interface

View the VLAN configuration details for an interface.

```bash
# Show VLAN details
cat /proc/net/vlan/config

# Detailed info for specific VLAN
cat /proc/net/vlan/vlan20

# Or use ip command
ip -d link show vlan20
```

## Inter-VLAN Routing

Devices on different VLANs cannot communicate directly. You need a Layer 3 device (router or Linux server) to route between them.

### Enable IP Forwarding

First, enable packet forwarding on the Ubuntu server that will act as a router.

```bash
# Enable IP forwarding temporarily
sudo sysctl -w net.ipv4.ip_forward=1

# Make it permanent
echo "net.ipv4.ip_forward = 1" | sudo tee -a /etc/sysctl.conf
sudo sysctl -p
```

### Configure the Router-on-a-Stick

This server has interfaces on multiple VLANs and routes between them.

```yaml
# /etc/netplan/01-router.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  vlans:
    vlan10:
      id: 10
      link: eth0
      addresses:
        - 192.168.10.1/24  # Gateway for VLAN 10
    vlan20:
      id: 20
      link: eth0
      addresses:
        - 192.168.20.1/24  # Gateway for VLAN 20
    vlan30:
      id: 30
      link: eth0
      addresses:
        - 192.168.30.1/24  # Gateway for VLAN 30
```

Clients on each VLAN should use this server as their default gateway.

### Add Static Routes

If you have multiple routers, add static routes for remote networks.

```yaml
# /etc/netplan/01-router.yaml
network:
  version: 2
  vlans:
    vlan20:
      id: 20
      link: eth0
      addresses:
        - 192.168.20.1/24
      routes:
        # Route to datacenter network via another router
        - to: 10.0.0.0/8
          via: 192.168.20.254
```

## Firewall Rules Between VLANs

Just because you can route between VLANs doesn't mean you should allow all traffic. Use iptables or nftables to control inter-VLAN traffic.

### Basic iptables Rules

Control which VLANs can communicate with each other.

```bash
# Allow VLAN 20 (production) to reach VLAN 40 (storage)
sudo iptables -A FORWARD -i vlan20 -o vlan40 -j ACCEPT
sudo iptables -A FORWARD -i vlan40 -o vlan20 -m state --state ESTABLISHED,RELATED -j ACCEPT

# Block VLAN 30 (dev) from reaching VLAN 20 (production)
sudo iptables -A FORWARD -i vlan30 -o vlan20 -j DROP

# Allow VLAN 10 (management) to reach all VLANs
sudo iptables -A FORWARD -i vlan10 -j ACCEPT
sudo iptables -A FORWARD -o vlan10 -m state --state ESTABLISHED,RELATED -j ACCEPT

# Log and drop everything else
sudo iptables -A FORWARD -j LOG --log-prefix "INTER-VLAN DROP: "
sudo iptables -A FORWARD -j DROP
```

### Comprehensive Firewall Script

Create a script to manage inter-VLAN firewall rules systematically.

```bash
#!/bin/bash
# /usr/local/bin/vlan-firewall.sh

# Flush existing rules
iptables -F FORWARD

# Default policy: drop
iptables -P FORWARD DROP

# Allow established connections
iptables -A FORWARD -m state --state ESTABLISHED,RELATED -j ACCEPT

# VLAN 10 (Management) - can reach everything
iptables -A FORWARD -i vlan10 -j ACCEPT

# VLAN 20 (Production) -> VLAN 40 (Storage) - only specific ports
iptables -A FORWARD -i vlan20 -o vlan40 -p tcp --dport 3260 -j ACCEPT  # iSCSI
iptables -A FORWARD -i vlan20 -o vlan40 -p tcp --dport 2049 -j ACCEPT  # NFS
iptables -A FORWARD -i vlan20 -o vlan40 -p udp --dport 2049 -j ACCEPT  # NFS

# VLAN 30 (Dev) -> VLAN 20 (Production) - blocked
iptables -A FORWARD -i vlan30 -o vlan20 -j LOG --log-prefix "DEV->PROD BLOCKED: "
iptables -A FORWARD -i vlan30 -o vlan20 -j DROP

# VLAN 100 (DMZ) - can only reach internet, not internal
iptables -A FORWARD -i vlan100 -o eth0 -j ACCEPT
iptables -A FORWARD -i vlan100 -d 10.0.0.0/8 -j DROP
iptables -A FORWARD -i vlan100 -d 172.16.0.0/12 -j DROP
iptables -A FORWARD -i vlan100 -d 192.168.0.0/16 -j DROP

# Log dropped packets for debugging
iptables -A FORWARD -j LOG --log-prefix "VLAN FW DROP: " --log-level 4
```

Make the script executable and run at boot.

```bash
sudo chmod +x /usr/local/bin/vlan-firewall.sh

# Add to rc.local or create systemd service
sudo /usr/local/bin/vlan-firewall.sh
```

### Using nftables (Modern Alternative)

nftables is the successor to iptables and provides cleaner syntax.

```bash
# /etc/nftables.conf
#!/usr/sbin/nft -f

flush ruleset

table inet vlan_filter {
    chain forward {
        type filter hook forward priority 0; policy drop;

        # Allow established
        ct state established,related accept

        # Management VLAN can reach all
        iifname "vlan10" accept

        # Production to Storage (specific ports)
        iifname "vlan20" oifname "vlan40" tcp dport { 3260, 2049 } accept
        iifname "vlan20" oifname "vlan40" udp dport 2049 accept

        # Block dev to production
        iifname "vlan30" oifname "vlan20" log prefix "DEV->PROD: " drop

        # Log everything else
        log prefix "VLAN DROP: "
    }
}
```

Apply nftables rules.

```bash
sudo nft -f /etc/nftables.conf
sudo systemctl enable nftables
```

## Testing VLAN Connectivity

Thorough testing prevents production issues. Here's a systematic approach.

### Basic Connectivity Tests

Test from the server with VLAN interfaces.

```bash
# Check interface is up with correct IP
ip addr show vlan20

# Ping the gateway
ping -c 4 192.168.20.1

# Ping another host on the same VLAN
ping -c 4 192.168.20.100

# Test DNS resolution
dig google.com @8.8.8.8
```

### Cross-VLAN Routing Tests

Verify inter-VLAN routing works (if configured).

```bash
# From a host on VLAN 20, ping a host on VLAN 30
ping -c 4 192.168.30.100

# Trace the route
traceroute 192.168.30.100

# Should show the router IP as the first hop
```

### VLAN Connectivity Test Script

Automate testing with a comprehensive script.

```bash
#!/bin/bash
# /usr/local/bin/test-vlans.sh

declare -A VLANS=(
    ["vlan10"]="192.168.10.1"
    ["vlan20"]="192.168.20.1"
    ["vlan30"]="192.168.30.1"
    ["vlan40"]="192.168.40.1"
)

echo "=== VLAN Connectivity Test ==="
echo "Date: $(date)"
echo ""

for vlan in "${!VLANS[@]}"; do
    gateway="${VLANS[$vlan]}"
    echo "--- Testing $vlan (gateway: $gateway) ---"

    # Check interface exists
    if ip link show "$vlan" &>/dev/null; then
        echo "[OK] Interface $vlan exists"

        # Check interface is up
        state=$(ip -br link show "$vlan" | awk '{print $2}')
        if [[ "$state" == "UP" ]]; then
            echo "[OK] Interface is UP"
        else
            echo "[FAIL] Interface is $state"
            continue
        fi

        # Get IP address
        ip_addr=$(ip -br addr show "$vlan" | awk '{print $3}')
        echo "[INFO] IP Address: $ip_addr"

        # Ping gateway
        if ping -c 2 -W 2 "$gateway" &>/dev/null; then
            echo "[OK] Gateway $gateway reachable"
        else
            echo "[FAIL] Cannot reach gateway $gateway"
        fi
    else
        echo "[FAIL] Interface $vlan does not exist"
    fi
    echo ""
done

echo "=== Test Complete ==="
```

### Testing with Packet Captures

Use tcpdump to verify VLAN tagging.

```bash
# Capture tagged traffic on physical interface
sudo tcpdump -i eth0 -nn -e 'vlan 20' -c 10

# Capture on VLAN interface (will show untagged)
sudo tcpdump -i vlan20 -nn icmp -c 10

# Save capture for analysis
sudo tcpdump -i eth0 -nn -e vlan -w /tmp/vlan-traffic.pcap
```

## Persistent VLAN Configuration

Ensure VLANs survive reboots with proper persistence.

### Netplan Persistence

Netplan configurations in `/etc/netplan/` are automatically persistent. Just ensure:

```bash
# Correct file permissions
sudo chmod 600 /etc/netplan/*.yaml

# Validate configuration
sudo netplan generate

# Apply
sudo netplan apply
```

### Verify Persistence After Reboot

Create a post-boot verification script.

```bash
#!/bin/bash
# /etc/networkd-dispatcher/routable.d/50-vlan-verify

EXPECTED_VLANS="vlan10 vlan20 vlan30"

for vlan in $EXPECTED_VLANS; do
    if ! ip link show "$vlan" &>/dev/null; then
        logger "WARNING: VLAN interface $vlan not found after boot"
    fi
done
```

Make it executable.

```bash
sudo chmod +x /etc/networkd-dispatcher/routable.d/50-vlan-verify
```

### systemd-networkd Status

Check networkd status after boot.

```bash
# Check overall status
networkctl status

# Check specific interface
networkctl status vlan20

# View networkd logs
journalctl -u systemd-networkd -b
```

## VLAN with Bridged Networks

Bridges let you connect VLANs to virtual machines or containers. This is essential for virtualization hosts.

### Bridge with VLAN (Netplan)

Create a bridge that includes a VLAN interface for VM networking.

```yaml
# /etc/netplan/01-bridge-vlan.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  vlans:
    vlan20:
      id: 20
      link: eth0
  bridges:
    br-vlan20:
      interfaces: [vlan20]
      addresses:
        - 192.168.20.1/24
      parameters:
        stp: false
        forward-delay: 0
```

### Multiple Bridges for Multiple VLANs

Create separate bridges for each VLAN, useful for KVM/QEMU virtualization.

```yaml
# /etc/netplan/01-multi-bridge.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      dhcp4: false
  vlans:
    vlan20:
      id: 20
      link: eth0
    vlan30:
      id: 30
      link: eth0
    vlan40:
      id: 40
      link: eth0
  bridges:
    br-prod:
      interfaces: [vlan20]
      addresses: [192.168.20.1/24]
      parameters:
        stp: false
    br-dev:
      interfaces: [vlan30]
      addresses: [192.168.30.1/24]
      parameters:
        stp: false
    br-storage:
      interfaces: [vlan40]
      addresses: [192.168.40.1/24]
      mtu: 9000
      parameters:
        stp: false
```

### Using Bridges with libvirt/KVM

Define a libvirt network that uses the VLAN bridge.

```xml
<!-- /etc/libvirt/qemu/networks/vlan20-network.xml -->
<network>
  <name>vlan20-network</name>
  <forward mode="bridge"/>
  <bridge name="br-vlan20"/>
</network>
```

Activate the libvirt network.

```bash
sudo virsh net-define /etc/libvirt/qemu/networks/vlan20-network.xml
sudo virsh net-start vlan20-network
sudo virsh net-autostart vlan20-network
```

## Docker Containers in VLANs

Docker can use VLAN networks through macvlan or ipvlan drivers.

### Macvlan Network for Docker

Macvlan gives containers their own MAC address on a VLAN. Containers appear as physical hosts on the network.

```bash
# Create a macvlan network on VLAN 20
docker network create -d macvlan \
  --subnet=192.168.20.0/24 \
  --gateway=192.168.20.1 \
  -o parent=eth0.20 \
  vlan20-net
```

Note: You need to create the VLAN interface first if not using Netplan.

```bash
# Create VLAN interface manually if needed
sudo ip link add link eth0 name eth0.20 type vlan id 20
sudo ip link set eth0.20 up
```

### Run Container on VLAN Network

Launch containers directly on the VLAN.

```bash
# Run nginx on VLAN 20 with a specific IP
docker run -d --name web-vlan20 \
  --network vlan20-net \
  --ip 192.168.20.100 \
  nginx

# Verify the container's IP
docker inspect web-vlan20 | grep IPAddress
```

### IPvlan Network for Docker

IPvlan is similar to macvlan but shares the host's MAC address. Useful when switches limit MAC addresses per port.

```bash
# Create ipvlan L2 network
docker network create -d ipvlan \
  --subnet=192.168.20.0/24 \
  --gateway=192.168.20.1 \
  -o parent=eth0.20 \
  -o ipvlan_mode=l2 \
  vlan20-ipvlan
```

### Docker Compose with VLAN Networks

Define VLAN networks in Docker Compose.

```yaml
# docker-compose.yml
version: '3.8'

services:
  web:
    image: nginx
    networks:
      vlan20:
        ipv4_address: 192.168.20.100

  api:
    image: myapi:latest
    networks:
      vlan20:
        ipv4_address: 192.168.20.101
      vlan40:
        ipv4_address: 192.168.40.101

networks:
  vlan20:
    driver: macvlan
    driver_opts:
      parent: eth0.20
    ipam:
      config:
        - subnet: 192.168.20.0/24
          gateway: 192.168.20.1

  vlan40:
    driver: macvlan
    driver_opts:
      parent: eth0.40
    ipam:
      config:
        - subnet: 192.168.40.0/24
          gateway: 192.168.40.1
```

### Host-to-Container Communication with Macvlan

Macvlan has a limitation: the host cannot directly communicate with containers on the macvlan network. Create a macvlan interface on the host to enable this.

```bash
# Create a macvlan interface on the host for communication with containers
sudo ip link add vlan20-host link eth0.20 type macvlan mode bridge
sudo ip addr add 192.168.20.2/24 dev vlan20-host
sudo ip link set vlan20-host up

# Now the host can ping containers
ping 192.168.20.100
```

Make this persistent with Netplan.

```yaml
# /etc/netplan/02-docker-macvlan.yaml
network:
  version: 2
  ethernets:
    vlan20-host:
      match:
        macaddress: "auto-generated"
      addresses:
        - 192.168.20.2/24
```

## Troubleshooting

When VLANs don't work, follow this systematic debugging approach.

### VLAN Interface Not Created

Check the 8021q module is loaded.

```bash
# Verify module
lsmod | grep 8021q

# Load if missing
sudo modprobe 8021q

# Check dmesg for errors
dmesg | grep -i vlan
```

### No Connectivity on VLAN

Verify the physical interface and VLAN configuration.

```bash
# Check physical interface is up
ip link show eth0

# Check VLAN interface exists and is up
ip link show vlan20

# Verify IP address is assigned
ip addr show vlan20

# Check routing table
ip route show

# Verify gateway is reachable
ping -c 2 192.168.20.1
```

### Switch-Side Issues

Common switch misconfigurations:

```bash
# VLAN not allowed on trunk
# Fix: On switch, add VLAN to trunk allowed list

# Wrong native VLAN
# Fix: Ensure native VLAN matches on both ends

# Port in access mode instead of trunk
# Fix: Configure port as trunk
```

### Capture and Analyze Traffic

Use tcpdump to see what's happening at the packet level.

```bash
# See if tagged frames are arriving
sudo tcpdump -i eth0 -nn -e 'vlan 20' -c 20

# Check for VLAN tag mismatch
sudo tcpdump -i eth0 -nn -e vlan -c 50

# See ARP requests/replies
sudo tcpdump -i vlan20 -nn arp -c 10
```

### MTU Issues

VLAN tagging adds 4 bytes to frame size. If MTU is set to 1500, tagged frames may be fragmented or dropped.

```bash
# Check current MTU
ip link show eth0 | grep mtu

# Set MTU to accommodate VLAN header
sudo ip link set eth0 mtu 1504

# Or in Netplan
# ethernets:
#   eth0:
#     mtu: 1504
```

### VLAN Debugging Checklist

Work through this list when troubleshooting.

```bash
#!/bin/bash
# vlan-debug.sh

VLAN_IF="vlan20"
PARENT_IF="eth0"
VLAN_ID="20"
GATEWAY="192.168.20.1"

echo "=== VLAN Debugging for $VLAN_IF ==="

# 1. Kernel module
echo -n "8021q module: "
lsmod | grep -q 8021q && echo "LOADED" || echo "NOT LOADED"

# 2. Parent interface
echo -n "Parent interface $PARENT_IF: "
ip link show $PARENT_IF | grep -q "state UP" && echo "UP" || echo "DOWN"

# 3. VLAN interface exists
echo -n "VLAN interface $VLAN_IF: "
ip link show $VLAN_IF &>/dev/null && echo "EXISTS" || echo "MISSING"

# 4. VLAN interface state
echo -n "VLAN interface state: "
ip link show $VLAN_IF 2>/dev/null | grep -q "state UP" && echo "UP" || echo "DOWN"

# 5. IP address
echo -n "IP address: "
ip -br addr show $VLAN_IF 2>/dev/null | awk '{print $3}'

# 6. Gateway ping
echo -n "Gateway reachable: "
ping -c 1 -W 2 $GATEWAY &>/dev/null && echo "YES" || echo "NO"

# 7. ARP entry for gateway
echo -n "ARP entry for gateway: "
arp -n | grep -q $GATEWAY && echo "PRESENT" || echo "MISSING"

# 8. Route to gateway network
echo -n "Route exists: "
ip route | grep -q "${GATEWAY%.*}.0" && echo "YES" || echo "NO"

# 9. Tagged frames received (requires root)
echo "Checking for tagged frames on $PARENT_IF..."
sudo timeout 5 tcpdump -i $PARENT_IF -nn -e "vlan $VLAN_ID" -c 5 2>/dev/null || echo "No frames captured"
```

### Common Error Messages

**"RTNETLINK answers: File exists"** - VLAN interface already exists. Delete it first:
```bash
sudo ip link delete vlan20
```

**"Cannot find device"** - Parent interface doesn't exist or has wrong name:
```bash
ip link show  # List all interfaces
```

**"Operation not supported"** - 8021q module not loaded:
```bash
sudo modprobe 8021q
```

---

VLANs are foundational for network segmentation and security. Once configured, they provide logical isolation without physical infrastructure changes. Start with simple configurations, test thoroughly, and build complexity as needed.

Monitoring your VLAN infrastructure is critical for maintaining network health. **[OneUptime](https://oneuptime.com)** provides comprehensive infrastructure monitoring that can track the health of your network interfaces, alert you when VLAN connectivity degrades, and help you troubleshoot network issues before they impact your users. With OneUptime, you can monitor inter-VLAN routing latency, track interface statistics, and receive alerts when network segmentation breaks down.
