# How to Add a Static Route on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Networking, Routing, Linux, IPv4

Description: Learn how to add temporary and persistent static routes on Linux using ip route and network configuration files.

## Adding a Temporary Static Route

Static routes added with `ip route add` are lost after reboot:

```bash
# Add route to 10.0.0.0/24 via gateway 192.168.1.254

ip route add 10.0.0.0/24 via 192.168.1.254

# Add route via specific interface
ip route add 10.0.0.0/24 via 192.168.1.254 dev eth0

# Add route with metric (lower = more preferred)
ip route add 10.0.0.0/24 via 192.168.1.254 metric 100

# Add a host route (/32)
ip route add 10.0.0.1/32 via 192.168.1.254

# Add default gateway
ip route add default via 192.168.1.1
```

## Replacing an Existing Route

```bash
# Replace route, or add it if it does not exist
ip route replace 10.0.0.0/24 via 192.168.1.100
```

## Verifying the Route Was Added

```bash
# View the routing table
ip route show

# Test which route will be used for a destination
ip route get 10.0.0.5
```

## Making Static Routes Persistent

### Ubuntu / Debian systems using Netplan

```yaml
# /etc/netplan/01-static-routes.yaml
network:
  version: 2
  ethernets:
    eth0:
      routes:
        - to: 10.0.0.0/24
          via: 192.168.1.254
        - to: 172.16.0.0/12
          via: 192.168.1.254
```

```bash
sudo netplan apply
```

### RHEL/CentOS 7 (ifcfg files)

```bash
# /etc/sysconfig/network-scripts/route-eth0
10.0.0.0/24 via 192.168.1.254
172.16.0.0/12 via 192.168.1.254
```

```bash
systemctl restart network
```

### RHEL/CentOS 8+ (NetworkManager)

```bash
# Using nmcli
nmcli connection modify <connection_name> +ipv4.routes "10.0.0.0/24 192.168.1.254"
nmcli connection up <connection_name>

# Verify
nmcli connection show <connection_name> | grep ipv4.routes
```

### systemd-networkd

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]

[Route]
Destination=10.0.0.0/24
Gateway=192.168.1.254

[Route]
Destination=172.16.0.0/12
Gateway=192.168.1.254
```

### Using /etc/rc.local (Legacy)

```bash
# /etc/rc.local
ip route add 10.0.0.0/24 via 192.168.1.254
ip route add 172.16.0.0/12 via 192.168.1.254
```

## Multiple Routes to the Same Destination (ECMP)

```bash
# Add two equal-cost paths (ECMP)
ip route add 10.0.0.0/24 nexthop via 192.168.1.254 dev eth0 weight 1 \
                          nexthop via 192.168.2.254 dev eth1 weight 1
```

## Script: Add Multiple Routes

```bash
#!/bin/bash
# Add routes for multiple corporate networks
GATEWAY="192.168.1.254"
NETWORKS=(
    "10.10.0.0/24"
    "10.20.0.0/24"
    "172.16.5.0/24"
    "172.16.10.0/24"
)

for net in "${NETWORKS[@]}"; do
    if ip route add "$net" via "$GATEWAY" 2>/dev/null; then
        echo "Added: $net via $GATEWAY"
    else
        echo "Not added: $net via $GATEWAY"
    fi
done
```

## Key Takeaways

- `ip route add NETWORK via GATEWAY` adds a temporary static route.
- `ip route replace` changes an existing route or adds a new one.
- Persist routes with Netplan (Ubuntu), nmcli (RHEL 8+), or systemd-networkd.
- Use `nexthop` for ECMP (Equal-Cost Multi-Path) routes.

**Related Reading:**

- [How to View the Routing Table on Linux](https://oneuptime.com/blog/post/2026-03-20-view-routing-table-linux/view)
- [How to Delete a Static Route on Linux](https://oneuptime.com/blog/post/2026-03-20-delete-static-route-linux/view)
- [How to Configure a Default Gateway on Linux](https://oneuptime.com/blog/post/2026-03-20-configure-default-gateway-linux/view)
