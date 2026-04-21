# How to Add a Static Route on Arch Linux Using systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Static Routes, Arch Linux, systemd-networkd, IPv4, .network, Networking

Description: Learn how to add persistent static routes on Arch Linux using systemd-networkd .network files, including multiple routes, route metrics, and table assignments.

---

Arch Linux can use systemd-networkd for network configuration. When systemd-networkd manages an interface, static routes are defined in `.network` files in `/etc/systemd/network/`.

## Enabling systemd-networkd on Arch

```bash
# Enable and start systemd-networkd

systemctl enable --now systemd-networkd

# For DNS resolution, also enable systemd-resolved
systemctl enable --now systemd-resolved
ln -sf /run/systemd/resolve/stub-resolv.conf /etc/resolv.conf
```

## Adding a Static Route

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
Address=10.0.0.5/24
Gateway=10.0.0.1
DNS=10.0.0.1

# Static route to remote network
[Route]
Destination=192.168.2.0/24
Gateway=10.0.0.1

# Another static route
[Route]
Destination=172.16.0.0/12
Gateway=10.0.0.254
```

## Route with Metric

```ini
[Route]
Destination=0.0.0.0/0
Gateway=10.0.0.1
# Lower metric = higher priority
Metric=100

[Route]
Destination=0.0.0.0/0
Gateway=10.0.0.2
# Backup default route
Metric=200
```

## Route to Specific Table (Policy Routing)

```ini
[Route]
Destination=0.0.0.0/0
Gateway=10.0.0.1
# Add to routing table 100
Table=100

[RoutingPolicyRule]
From=10.0.0.5/32
Table=100
Priority=100
```

## On-Link Route (No Gateway)

```ini
# For tunnel interfaces or directly reachable networks not in local subnet
[Route]
Destination=10.8.0.0/24
# On-link: route directly without gateway
Scope=link
```

## Applying Configuration

```bash
# Reload networkd to pick up changes
networkctl reload

# Verify routes
ip route show
networkctl status eth0

# Check specific route
ip route get 192.168.2.10
```

## Debugging

```bash
# Check networkd journal
journalctl -u systemd-networkd -f

# List links and their status
networkctl list

# Show detailed interface status
networkctl status eth0
```

## DHCP with Additional Static Routes

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=yes

# Static route in addition to DHCP-assigned routes
[Route]
Destination=10.99.0.0/24
Gateway=192.168.1.254
```

## Key Takeaways

- On Arch Linux with systemd-networkd, add static routes in `[Route]` sections within `.network` files.
- Multiple `[Route]` sections can exist in a single `.network` file for multiple routes.
- Use `Metric=` to set route priority when multiple routes to the same destination exist (lower = preferred).
- Run `networkctl reload` to apply changes; verify with `ip route show` and `ip route get <destination>`.
