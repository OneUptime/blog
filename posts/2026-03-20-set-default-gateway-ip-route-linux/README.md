# How to Set a Default Gateway Using ip route on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Routing, Default Gateway, ip command, IPv4

Description: Set the default IPv4 gateway on Linux using ip route add default, replace an existing gateway, verify reachability, and make the change persistent across reboots.

## Introduction

The default gateway is the next-hop router used for all traffic that does not match a more specific route. Without a default route or more specific static routes, a Linux host can only communicate on its directly-attached subnets. Setting the correct default gateway is the final step in basic network configuration.

## Adding a Default Route

```bash
# Set the default gateway to 192.168.1.1 via eth0

sudo ip route add default via 192.168.1.1 dev eth0

# Verify
ip route show default
# Output: default via 192.168.1.1 dev eth0
```

If no existing default route is present, this adds it immediately.

## Replacing an Existing Default Route

If a default route with the same table and metric already exists, adding another default route can fail with "RTNETLINK answers: File exists". Use `replace` to update it:

```bash
# Replace the default gateway with a new one
sudo ip route replace default via 192.168.1.254 dev eth0

# Or delete the old one and add the new one
sudo ip route del default
sudo ip route add default via 192.168.1.254 dev eth0
```

## Setting Default Gateway with Metric

If you have two interfaces and want a primary and backup:

```bash
# Primary gateway via eth0
sudo ip route add default via 192.168.1.1 dev eth0 metric 100

# Backup gateway via eth1
sudo ip route add default via 10.0.0.1 dev eth1 metric 200
```

The lower-metric route is used first. If eth0 goes down and its route is removed, traffic can shift to eth1; a dead gateway on an otherwise-up link usually needs separate monitoring.

## Verifying Connectivity

```bash
# Confirm the default gateway is reachable
ping -c 3 192.168.1.1

# Confirm external connectivity
ping -c 3 8.8.8.8

# Trace the path to confirm gateway is first hop
traceroute 8.8.8.8
```

## Checking Which Gateway Is Active

```bash
# Show the exact route used for a specific destination
ip route get 8.8.8.8
```

Output shows the selected gateway and source address:

```text
8.8.8.8 via 192.168.1.1 dev eth0 src 192.168.1.100
```

## Making the Default Gateway Persistent

**Netplan (Ubuntu):**

```yaml
network:
  version: 2
  ethernets:
    eth0:
      addresses: [192.168.1.100/24]
      routes:
        - to: default
          via: 192.168.1.1
```

**Debian /etc/network/interfaces:**

```text
auto eth0
iface eth0 inet static
    address 192.168.1.100
    netmask 255.255.255.0
    gateway 192.168.1.1
```

**NetworkManager (existing static IPv4 connection):**

```bash
nmcli con mod "Wired connection 1" ipv4.gateway 192.168.1.1
nmcli con up "Wired connection 1"
```

**RHEL/CentOS legacy network-scripts (/etc/sysconfig/network-scripts/ifcfg-eth0):**

```text
GATEWAY=192.168.1.1
```

## Conclusion

`ip route add default via <gateway>` sets the default route. Use `ip route replace` to change it without errors, set metrics to prefer one route over another, and verify with `ip route get 8.8.8.8`. Persist through your distro's network configuration system to survive reboots.
