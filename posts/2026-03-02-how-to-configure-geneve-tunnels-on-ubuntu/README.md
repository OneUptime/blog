# How to Configure GENEVE Tunnels on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, GENEVE, Tunneling, SDN

Description: Learn how to configure GENEVE (Generic Network Virtualization Encapsulation) tunnels on Ubuntu for flexible overlay networking with extensible metadata support.

---

GENEVE (Generic Network Virtualization Encapsulation) is an overlay tunneling protocol designed to supersede both VXLAN and NVGRE. Like VXLAN, it carries layer-2 frames over UDP. Unlike VXLAN, it has an extensible options header that allows tunnel endpoints to exchange arbitrary metadata alongside the encapsulated traffic. Open vSwitch, OVN (Open Virtual Network), and several cloud networking systems use GENEVE as their default tunnel type.

This guide configures GENEVE tunnels on Ubuntu using both the Linux kernel's native `geneve` driver and Open vSwitch.

## GENEVE vs VXLAN

| Feature | VXLAN | GENEVE |
|---------|-------|--------|
| Transport | UDP | UDP |
| VNI size | 24 bits | 24 bits |
| Default port | 4789 | 6081 |
| Options header | No | Yes (variable length) |
| Multicast support | Yes | No |
| Hardware offload | Broad | Growing |
| Used by | Many | OVN, Cilium, AWS VPC |

For most use cases they are functionally equivalent. Choose GENEVE when you need metadata in tunnel packets or when your SDN controller requires it.

## Prerequisites

```bash
# Check kernel support for GENEVE
modinfo geneve 2>/dev/null && echo "GENEVE supported" || echo "Not supported"

# Load the module
sudo modprobe geneve

# Make it persistent
echo 'geneve' | sudo tee /etc/modules-load.d/geneve.conf
```

Ubuntu 20.04 and 22.04 both include GENEVE support in the default kernel.

## Setup Topology

- **Host A**: `192.168.1.10`, private network `10.10.0.0/24`
- **Host B**: `192.168.1.20`, private network `10.20.0.0/24`
- **Tunnel endpoint IPs**: `169.254.10.1` (A) and `169.254.10.2` (B)

## Creating GENEVE Tunnels with iproute2

**On Host A:**

```bash
# Create a GENEVE tunnel interface
# id: the VNI (Virtual Network Identifier) - must match on both ends
# remote: the other host's IP
sudo ip link add geneve0 type geneve \
  id 100 \
  remote 192.168.1.20

# Bring the interface up
sudo ip link set geneve0 up

# Assign a tunnel endpoint IP
sudo ip addr add 169.254.10.1/30 dev geneve0

# Verify
ip addr show geneve0
ip link show geneve0
```

**On Host B:**

```bash
# Create the matching GENEVE tunnel (remote points back to Host A)
sudo ip link add geneve0 type geneve \
  id 100 \
  remote 192.168.1.10

sudo ip link set geneve0 up
sudo ip addr add 169.254.10.2/30 dev geneve0
```

## Testing Basic Connectivity

```bash
# From Host A, ping Host B's tunnel endpoint
ping -c 4 169.254.10.2
```

Capture the encapsulated traffic:

```bash
# On Host B, capture GENEVE packets (UDP port 6081)
sudo tcpdump -i eth0 -n udp port 6081 -v
```

You will see UDP packets on port 6081 with the GENEVE header containing the VNI.

## Adding Routes Between Private Networks

Enable IP forwarding and add routes:

**On Host A:**

```bash
sudo sysctl -w net.ipv4.ip_forward=1
sudo ip route add 10.20.0.0/24 via 169.254.10.2 dev geneve0
```

**On Host B:**

```bash
sudo sysctl -w net.ipv4.ip_forward=1
sudo ip route add 10.10.0.0/24 via 169.254.10.1 dev geneve0
```

Make IP forwarding persistent:

```bash
echo 'net.ipv4.ip_forward=1' | sudo tee /etc/sysctl.d/99-forward.conf
sudo sysctl -p /etc/sysctl.d/99-forward.conf
```

## Firewall Rules

GENEVE uses UDP port 6081:

```bash
# Allow GENEVE from the remote host
sudo ufw allow from 192.168.1.20 to any port 6081 proto udp
```

## GENEVE with a Custom VNI

The VNI (id) must match on both tunnel endpoints. To create multiple isolated GENEVE tunnels:

```bash
# Tunnel for VLAN 100 (tenant A)
sudo ip link add geneve100 type geneve id 100 remote 192.168.1.20
sudo ip link set geneve100 up
sudo ip addr add 169.254.100.1/30 dev geneve100

# Tunnel for VLAN 200 (tenant B)
sudo ip link add geneve200 type geneve id 200 remote 192.168.1.20
sudo ip link set geneve200 up
sudo ip addr add 169.254.200.1/30 dev geneve200
```

## GENEVE with Open vSwitch

OVN (Open Virtual Network) uses GENEVE as its default tunnel type. For direct OVS use:

```bash
# Install OVS if not already installed
sudo apt install openvswitch-switch -y

# Create a bridge
sudo ovs-vsctl add-br br-geneve

# Add a GENEVE port pointing to Host B
sudo ovs-vsctl add-port br-geneve geneve0 -- \
  set interface geneve0 type=geneve \
  options:remote_ip=192.168.1.20 \
  options:key=100

# Verify
sudo ovs-vsctl show
```

The OVS GENEVE port handles the encapsulation automatically, and OVS flow rules control forwarding within the overlay network.

## Configuring OVN with GENEVE

OVN provides a higher-level abstraction over OVS using GENEVE tunnels:

```bash
# Install OVN
sudo apt install ovn-central ovn-host -y

# Initialize the Northbound database
sudo ovn-nbctl init

# Set the encapsulation type to GENEVE for a chassis
sudo ovs-vsctl set open_vswitch . \
  external-ids:system-id=$(hostname) \
  external-ids:ovn-encap-type=geneve \
  external-ids:ovn-encap-ip=192.168.1.10

# Connect to the OVN central (SBDB)
sudo ovs-vsctl set open_vswitch . \
  external-ids:ovn-remote=tcp:192.168.1.10:6642
```

With OVN configured, you can create logical switches and routers without dealing with tunnel configuration directly - OVN manages the GENEVE tunnels automatically.

## Making GENEVE Persistent with systemd-networkd

```bash
# Create the GENEVE network device file
sudo nano /etc/systemd/network/20-geneve0.netdev
```

```ini
[NetDev]
Name=geneve0
Kind=geneve

[GENEVE]
Id=100
Remote=192.168.1.20
```

```bash
# Create the network configuration for the GENEVE interface
sudo nano /etc/systemd/network/20-geneve0.network
```

```ini
[Match]
Name=geneve0

[Network]
Address=169.254.10.1/30

[Route]
Destination=10.20.0.0/24
Gateway=169.254.10.2
```

```bash
# Enable and restart networkd
sudo systemctl enable systemd-networkd
sudo systemctl restart systemd-networkd

# Verify the interface came up
networkctl status geneve0
```

## MTU Considerations

GENEVE adds headers to every packet:
- Outer IP header: 20 bytes
- UDP header: 8 bytes
- GENEVE header: 8 bytes (minimum, more with options)
- Inner Ethernet header: 14 bytes

Total overhead without options: ~50 bytes. If the physical MTU is 1500 bytes:

```bash
# Set the GENEVE interface MTU to account for encapsulation overhead
sudo ip link set geneve0 mtu 1450

# Verify
ip link show geneve0 | grep mtu
```

For jumbo frames on the underlay:

```bash
# If the physical network supports 9000-byte frames
sudo ip link set eth0 mtu 9000
sudo ip link set geneve0 mtu 8950
```

## Tunnel Options (GENEVE Extensibility)

GENEVE's key feature is the ability to carry options (Type-Length-Value attributes) in the tunnel header. With iproute2, you can set options on individual packets using `ip route` with `encap` specifications:

```bash
# Route traffic to 10.20.0.0/24 via GENEVE with custom options
# Class 1, type 1, option data 0xdeadbeef
sudo ip route add 10.20.0.0/24 \
  encap geneve id 100 remote 192.168.1.20 \
  options 0001:01:deadbeef \
  dev eth0
```

This is primarily useful when the remote endpoint understands and processes those options (e.g., when both endpoints run specific SDN software).

## Troubleshooting

**GENEVE interface shows no traffic:**
```bash
# Check if packets are being encapsulated
sudo tcpdump -i eth0 udp port 6081 -c 10

# Check interface statistics
ip -s link show geneve0

# Verify the remote IP is reachable
ping -c 3 192.168.1.20
```

**High packet loss or MTU fragmentation:**
```bash
# Check if fragmentation is happening
sudo tcpdump -i eth0 udp port 6081 -v | grep frag

# Reduce MTU on the GENEVE interface
sudo ip link set geneve0 mtu 1400
```

**Module not loading:**
```bash
# Check kernel version (GENEVE requires 3.18+)
uname -r

# Manual load
sudo modprobe geneve

# Check for errors
dmesg | grep -i geneve
```

GENEVE's extensibility is its main advantage over VXLAN. If you are building custom SDN solutions or deploying OVN, GENEVE gives you the flexibility to attach policy metadata to tunnel packets. For straightforward overlay networking without custom options, either VXLAN or GENEVE works equally well.
