# How to Use Netplan with the NetworkManager Renderer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netplan, NetworkManager, Linux, Networking, Ubuntu, Desktop

Description: Configure Netplan to delegate network management to NetworkManager, enabling GUI tools and dynamic network switching on Ubuntu desktop systems.

## Introduction

NetworkManager is the preferred backend for desktop and laptop systems because it handles dynamic scenarios like WiFi roaming, VPN switching, and user-managed connections. Netplan can generate NetworkManager connection profiles from YAML, keeping configuration declarative while leveraging the full NetworkManager feature set.

## When to Use NetworkManager

- Ubuntu Desktop installations
- Laptops that switch between WiFi and wired connections
- Systems using GNOME or KDE network applets
- Scenarios requiring VPN integration via NetworkManager plugins

## Basic Configuration

Set `renderer: NetworkManager` in your Netplan YAML:

```yaml
# /etc/netplan/01-network-manager-all.yaml

network:
  version: 2
  renderer: NetworkManager    # Delegate all interfaces to NetworkManager
```

This single directive tells Netplan to let NetworkManager manage all interfaces - matching the default desktop behavior.

## Static IP via NetworkManager Renderer

You can still define static addresses in Netplan even with the NetworkManager renderer:

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: NetworkManager
  ethernets:
    eth0:
      addresses:
        - 192.168.1.20/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

## Applying the Configuration

```bash
# Apply with automatic rollback if not confirmed
sudo netplan try

# Apply and generate NetworkManager connection files
sudo netplan apply
```

Netplan writes connection profiles to `/run/NetworkManager/system-connections/`. You can view them:

```bash
# List generated NetworkManager profiles
ls /run/NetworkManager/system-connections/

# Inspect a generated profile (Netplan names connections as netplan-<id>)
sudo nmcli connection show netplan-eth0
```

## Verifying NetworkManager is Running

```bash
# Check NetworkManager status
systemctl status NetworkManager

# List all managed connections
nmcli connection show
```

## Mixing Renderers

You can mix renderers to have some interfaces managed by `networkd` and others by `NetworkManager`:

```yaml
network:
  version: 2
  ethernets:
    eth0:
      renderer: networkd       # Server NIC managed by networkd
      addresses:
        - 10.0.0.5/24
  wifis:
    wlan0:
      renderer: NetworkManager # WiFi managed by NetworkManager
      access-points:
        "MyHomeWiFi":
          password: "wifi-password"
      dhcp4: true
```

## Conclusion

The NetworkManager renderer is the right choice for desktop and interactive environments. By keeping configuration in Netplan YAML, you get repeatability while NetworkManager handles the dynamic aspects of network management.
