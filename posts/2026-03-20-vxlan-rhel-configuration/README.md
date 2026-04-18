# How to Configure VXLAN on Red Hat Enterprise Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VXLAN, RHEL, NetworkManager, nmcli, Overlay Networking, IPv4, Red Hat

Description: Learn how to configure VXLAN interfaces on Red Hat Enterprise Linux (RHEL) using nmcli and NetworkManager for persistent overlay network configuration.

---

On RHEL, VXLAN interfaces are managed by NetworkManager via nmcli. This provides persistent configuration and integration with the system's network management framework.

## Creating a VXLAN Interface with nmcli

```bash
# Create a VXLAN connection

nmcli connection add type vxlan \
  ifname vxlan10 \
  con-name vxlan10 \
  vxlan.id 10 \
  vxlan.remote 10.0.0.2 \
  vxlan.local 10.0.0.1 \
  vxlan.destination-port 4789 \
  vxlan.ageing 300 \
  vxlan.learning yes

# Assign IP to the VXLAN interface
nmcli connection modify vxlan10 \
  ipv4.method manual \
  ipv4.addresses "192.168.100.1/24" \
  connection.autoconnect yes

# Activate
nmcli connection up vxlan10
```

## Verifying the VXLAN Interface

```bash
# Show connection details
nmcli connection show vxlan10

# Show interface status
nmcli device show vxlan10

# Verify at kernel level
ip -d link show vxlan10

# Check IP
ip addr show vxlan10
```

## Attaching VXLAN to a Bridge

```bash
# Create bridge first
nmcli connection add type bridge \
  ifname br-vxlan \
  con-name br-vxlan \
  bridge.stp no \
  ipv4.method manual \
  ipv4.addresses "192.168.100.1/24"

# Add VXLAN as bridge slave
nmcli connection add type vxlan \
  ifname vxlan10 \
  con-name vxlan10 \
  vxlan.id 10 \
  vxlan.remote 10.0.0.2 \
  vxlan.local 10.0.0.1 \
  vxlan.destination-port 4789 \
  master br-vxlan

# Activate both
nmcli connection up br-vxlan
nmcli connection up vxlan10
```

## Available nmcli VXLAN Properties

```bash
# Show all VXLAN properties
nmcli connection show vxlan10 | grep vxlan

# Key properties:
# vxlan.id           - VNI (0-16777215)
# vxlan.remote       - Remote VTEP IP
# vxlan.local        - Local VTEP IP
# vxlan.parent       - Physical interface
# vxlan.destination-port - UDP port (4789)
# vxlan.ageing       - FDB ageing time (seconds)
# vxlan.learning     - Enable/disable learning
# vxlan.tos          - Type of Service
# vxlan.ttl          - Outer packet TTL
```

## Using ip Commands on RHEL (Temporary)

```bash
# For testing, use ip commands directly
ip link add vxlan10 type vxlan id 10 remote 10.0.0.2 local 10.0.0.1 dstport 4789
ip addr add 192.168.100.1/24 dev vxlan10
ip link set vxlan10 up

# To make permanent, use nmcli
```

## Firewall Configuration (firewalld)

```bash
# Allow VXLAN UDP port through firewalld
firewall-cmd --permanent --add-port=4789/udp
firewall-cmd --reload

# Or for a specific zone
firewall-cmd --permanent --zone=public --add-port=4789/udp
```

## Key Takeaways

- On RHEL, use `nmcli connection add type vxlan` to create persistent VXLAN interfaces managed by NetworkManager.
- Set `connection.autoconnect yes` to ensure the VXLAN interface comes up on boot.
- Use `firewall-cmd --add-port=4789/udp` to allow VXLAN traffic through firewalld (RHEL's default firewall).
- To attach a VXLAN to a bridge, set `master <bridge-name>` in the nmcli connection; both must be activated.
