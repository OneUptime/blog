# How to View Interface Status with networkctl

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, networkctl, systemd-networkd, Networking, Monitoring

Description: Use networkctl to view network interface status, IP addresses, DNS settings, DHCP leases, and operational state managed by systemd-networkd.

## Introduction

`networkctl` is the management tool for systemd-networkd. It provides detailed per-interface status including IP addresses, gateways, DNS servers, DHCP lease information, and operational/setup state - all in a single command.

## List All Network Interfaces

```bash
# Summary of all interfaces

networkctl list

# Example output:
# IDX LINK  TYPE     OPERATIONAL SETUP
#   1 lo    loopback carrier     unmanaged
#   2 eth0  ether    routable    configured
#   3 eth1  ether    no-carrier  configuring
```

## Show Detailed Status for an Interface

```bash
# Full status for eth0
networkctl status eth0

# Shows:
# - Link state and carrier
# - MAC address
# - IP addresses assigned
# - Default gateway
# - DNS servers
# - DHCP lease information
# - Network file in use
# - Driver information
```

## Show Status for All Interfaces

```bash
# Overall system network status (state, addresses, gateway, DNS)
networkctl status

# Detailed status for every link
networkctl status -a
```

## Check Operational States

```bash
# networkctl list output columns:
# OPERATIONAL: missing, off, no-carrier, dormant, degraded-carrier, carrier, degraded, enslaved, routable
# SETUP: pending, initialized, configuring, configured, unmanaged, failed, linger

# Quick check if interface is routable
networkctl list | grep routable
```

## Show DHCP Lease Details

```bash
# DHCP lease info is included in networkctl status
networkctl status eth0 | grep -A 10 "DHCP"

# Direct lease file
cat /run/systemd/netif/leases/$(ip link show eth0 | awk '/^[0-9]/{print $1}' | tr -d ':')
```

## Show DNS Configuration Per Interface

```bash
# DNS servers and search domains per interface
resolvectl status eth0

# Global DNS status
resolvectl status
```

## Monitor Interface Events

```bash
# Follow systemd-networkd logs for link state changes in real time
journalctl -u systemd-networkd -f

# Or watch link events directly from the kernel
ip monitor link
```

## Useful networkctl Commands

```bash
# Reload all .network configuration files
networkctl reload

# Reconfigure a specific interface
networkctl reconfigure eth0

# Renew DHCP lease
networkctl renew eth0

# Bring interface up
networkctl up eth0

# Bring interface down
networkctl down eth0
```

## Show Link Quality Information

```bash
# For wireless interfaces, shows signal strength, SSID
networkctl status wlan0

# For wired, shows speed and duplex
networkctl status eth0 | grep -i speed
```

## Conclusion

`networkctl list` gives a quick overview of all interfaces and their setup state. `networkctl status <interface>` provides comprehensive details including IP, routes, DNS, and DHCP information. Pair it with `journalctl -u systemd-networkd -f` or `ip monitor link` to watch real-time state changes. These commands are the primary interface for inspecting systemd-networkd-managed networking.
