# How to Switch Between DHCP and Static IP with nmcli

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: nmcli, NetworkManager, DHCP, Static IP, Linux, RHEL, Connection Management

Description: Learn how to switch a network interface between DHCP and static IP configuration using nmcli without creating a new connection profile, including rollback procedures.

---

Switching between DHCP and static IP is a common task for servers that start with DHCP during provisioning and are later assigned static IPs, or for troubleshooting.

## Switching from DHCP to Static IP

```bash
# View current connection (DHCP)

nmcli connection show eth0 | grep -E "ipv4.method|GENERAL.STATE"
# ipv4.method: auto

# Switch to static IP
nmcli connection modify eth0 \
  ipv4.method manual \
  ipv4.addresses "10.0.0.5/24" \
  ipv4.gateway "10.0.0.1" \
  ipv4.dns "10.0.0.1 8.8.8.8"

# Apply the change
nmcli connection up eth0

# Verify
nmcli connection show eth0 | grep -E "method|address|gateway|dns"
ip addr show eth0
ip route show
```

## Switching from Static to DHCP

```bash
# Remove static settings and enable DHCP
nmcli connection modify eth0 \
  ipv4.method auto \
  ipv4.addresses "" \
  ipv4.gateway "" \
  ipv4.dns ""

# Apply
nmcli connection up eth0

# Verify DHCP assigned an IP
ip addr show eth0
nmcli connection show eth0 | grep ipv4
```

## Switching with a Different Profile

```bash
# Better approach: create separate profiles for DHCP and static

# Static profile
nmcli connection add type ethernet ifname eth0 con-name eth0-static \
  ipv4.method manual ipv4.addresses "10.0.0.5/24" \
  ipv4.gateway "10.0.0.1" ipv4.dns "10.0.0.1"

# DHCP profile
nmcli connection add type ethernet ifname eth0 con-name eth0-dhcp \
  ipv4.method auto

# Switch to static
nmcli connection up eth0-static

# Switch to DHCP
nmcli connection up eth0-dhcp
```

## Checking Current IP Method

```bash
# Show active connections
nmcli -t -f NAME,DEVICE,TYPE,STATE connection show --active

# Check specific connection
nmcli connection show eth0 | grep ipv4.method
```

## Adding DNS Search Domain

```bash
nmcli connection modify eth0 \
  ipv4.dns-search "example.com internal.example.com"
nmcli connection up eth0
```

## Rollback Procedure

```bash
# If you lose connectivity after the change:
# (from console or out-of-band access)

# Revert to DHCP
nmcli connection modify eth0 ipv4.method auto ipv4.addresses "" ipv4.gateway "" ipv4.dns ""
nmcli connection up eth0

# Or restore a known-good static config
nmcli connection modify eth0 \
  ipv4.method manual ipv4.addresses "10.0.0.5/24" ipv4.gateway "10.0.0.1"
nmcli connection up eth0
```

## Key Takeaways

- Use `nmcli connection modify <name> ipv4.method manual` with IP/gateway to switch to static.
- Use `ipv4.method auto` with empty addresses/gateway/dns to switch back to DHCP.
- Apply changes with `nmcli connection up <name>` - modifications are not applied until the connection is (re)activated.
- Maintain a separate DHCP and static profile per interface for safer switching with less risk of losing access.
