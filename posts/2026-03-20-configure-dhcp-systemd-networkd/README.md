# How to Configure DHCP for IPv4 with systemd-networkd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, systemd-networkd, DHCP, IPv4, Networking, Configuration

Description: Configure DHCP-based IPv4 addressing on Linux interfaces using systemd-networkd .network files, with options for client identifier and DHCP options.

## Introduction

systemd-networkd can request an IPv4 address via DHCP by setting `DHCP=yes` or `DHCP=ipv4` in the `[Network]` section of a `.network` file. Additional DHCP client behavior (client ID, routes, DNS, hostname handling) can be tuned in a `[DHCPv4]` section.

## Basic DHCP Configuration

```ini
# /etc/systemd/network/10-eth0.network

[Match]
Name=eth0

[Network]
DHCP=ipv4
```

```bash
# Apply changes
systemctl restart systemd-networkd

# Verify
ip addr show eth0
ip route show
```

## DHCP with Custom Client Identifier

```ini
[Match]
Name=eth0

[Network]
DHCP=ipv4

[DHCPv4]
# Use MAC address as client identifier
ClientIdentifier=mac

# Or use an RFC 4361 client ID based on IAID and DUID (default)
# ClientIdentifier=duid
```

## Control Common DHCP Options

```ini
[Match]
Name=eth0

[Network]
DHCP=ipv4

[DHCPv4]
# Accept routes from DHCP server
UseRoutes=yes

# Accept DNS from DHCP server
UseDNS=yes

# Accept NTP servers from DHCP server
UseNTP=yes

# Accept transient hostname from DHCP
UseHostname=yes

# Optionally send a hostname to the DHCP server
Hostname=myhost
```

## DHCP with an Additional Static Address

```ini
[Match]
Name=eth0

[Network]
DHCP=ipv4
# Static address configured alongside the DHCP lease
Address=192.168.1.200/24

[DHCPv4]
# Set the metric for routes learned from DHCP
RouteMetric=100
```

## Renew the DHCP Lease Manually

```bash
# Request DHCP lease renewal on eth0
networkctl renew eth0

# Or restart the networkd service
systemctl restart systemd-networkd
```

## View DHCP Lease Information

```bash
# Show current network status including DHCP lease info
networkctl status eth0

# Show lease file (if it exists)
cat /run/systemd/netif/leases/*
```

## DHCP for Multiple Interfaces

```ini
# /etc/systemd/network/10-eth0.network
[Match]
Name=eth0

[Network]
DHCP=ipv4
```

```ini
# /etc/systemd/network/20-eth1.network
[Match]
Name=eth1

[Network]
DHCP=ipv4
```

## Conclusion

DHCP with systemd-networkd is configured by setting `DHCP=ipv4` in a `.network` file. The `[DHCPv4]` section controls DHCP client behavior, including which settings to accept from the DHCP server. Use `networkctl status <interface>` to view the assigned address and lease details. Run `networkctl renew <interface>` to request a new lease.
