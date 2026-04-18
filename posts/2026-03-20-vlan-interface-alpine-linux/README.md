# How to Configure a VLAN Interface on Alpine Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: VLAN, Alpine Linux, 802.1Q, /etc/network/interfaces, IPv4, Networking

Description: Learn how to configure 802.1Q VLAN interfaces on Alpine Linux using /etc/network/interfaces and the vlan package for persistent VLAN configuration.

---

Alpine Linux uses `ifupdown-ng` by default with `/etc/network/interfaces`, and it has built-in 802.1Q VLAN support — you do not need to install an extra package on modern Alpine. (Note: installing the legacy `vlan` package on an ifupdown-ng system will remove `ifupdown-ng` and break networking; only use it on systems running busybox ifupdown.)

## Loading the 8021q Kernel Module

```bash
# Load the module immediately
modprobe 8021q

# Persist module loading across reboots
echo "8021q" >> /etc/modules
```

## Basic VLAN Configuration

```bash
# /etc/network/interfaces

auto lo
iface lo inet loopback

# Parent trunk interface (no IP)
auto eth0
iface eth0 inet manual

# VLAN 10
auto eth0.10
iface eth0.10 inet static
  address 10.10.0.5
  netmask 255.255.255.0
  gateway 10.10.0.1

# VLAN 20 (DHCP)
auto eth0.20
iface eth0.20 inet dhcp
```

## Applying the Configuration

```bash
# Apply interface configuration
rc-service networking restart

# Or bring up specific interface
ifup eth0.10

# Verify
ip addr show eth0.10
ip -d link show eth0.10
```

## Using ip Commands Directly (Temporary)

```bash
# Create VLAN interface
ip link add link eth0 name eth0.10 type vlan id 10

# Assign IP and bring up
ip addr add 10.10.0.5/24 dev eth0.10
ip link set eth0.10 up
ip route add default via 10.10.0.1 dev eth0.10
```

## Docker on Alpine with VLANs

Alpine is a common base for Docker containers. VLAN interfaces in Alpine containers require the host to expose the VLAN interface:

```bash
# On host: create VLAN interface and assign to macvlan network
ip link add link eth0 name eth0.10 type vlan id 10
ip link set eth0.10 up

docker network create \
  -d macvlan \
  --subnet=10.10.0.0/24 \
  --gateway=10.10.0.1 \
  -o parent=eth0.10 \
  vlan10-net
```

## Verifying VLAN Operation

```bash
# Check /proc/net/vlan
cat /proc/net/vlan/config

# Check interface details
ip -d link show eth0.10
# Shows: vlan protocol 802.1Q id 10

# Test connectivity
ping -c3 10.10.0.1
```

## Key Takeaways

- Modern Alpine uses `ifupdown-ng` by default with built-in VLAN support — do not install the legacy `vlan` package, as it will remove `ifupdown-ng` and break networking.
- Load the `8021q` kernel module before configuring VLAN interfaces, and persist it by adding `8021q` to `/etc/modules`.
- In Alpine's ifupdown-ng, just name the interface `eth0.10` and it automatically uses `eth0` as the parent; the explicit `vlan-raw-device` / `vlan_id` stanzas are also supported.
- Alpine's minimal footprint makes it ideal for router/firewall containers where VLAN support is needed.
