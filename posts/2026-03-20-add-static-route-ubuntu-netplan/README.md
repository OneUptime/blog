# How to Add a Static Route on Ubuntu Using Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Ubuntu, Static Routes, Netplan, Networking, Network Configuration, Routing

Description: Add persistent static routes on Ubuntu by configuring the routes section in Netplan YAML files and applying with netplan apply.

## Introduction

On Ubuntu, Netplan is the standard way to configure persistent static routes. Routes defined in Netplan YAML files survive reboots and are applied automatically at boot. This is the recommended approach for production servers.

## Add a Static Route in Netplan

```yaml
# /etc/netplan/01-network.yaml

network:
  version: 2
  renderer: networkd

  ethernets:
    eth0:
      addresses:
        - 10.0.0.100/24
      routes:
        - to: 192.168.2.0/24
          via: 10.0.0.1
        - to: 172.16.0.0/16
          via: 10.0.0.1
      nameservers:
        addresses: [8.8.8.8]
```

## Apply the Configuration

```bash
# Validate syntax
netplan generate

# Apply routes
netplan apply

# Verify the routes were added
ip route show | grep 192.168.2.0
```

## Default Gateway Configuration

```yaml
routes:
  - to: default
    via: 10.0.0.1
```

## Multiple Routes with Metrics

```yaml
routes:
  - to: 192.168.2.0/24
    via: 10.0.0.1
    metric: 100    # Lower metric = preferred

  - to: 192.168.2.0/24
    via: 10.0.1.1
    metric: 200    # Higher metric = backup route
```

## Route via a Specific Interface

```yaml
routes:
  - to: 10.50.0.0/16
    scope: link       # No gateway - use interface directly
```

## Host Route (/32)

```yaml
routes:
  - to: 203.0.113.5/32
    via: 10.0.0.1
```

## Verify After Applying

```bash
# Check routes
ip route show

# Check specific route
ip route get 192.168.2.100

# If using systemd-networkd, check interface status
networkctl status eth0
```

## Conclusion

Netplan static routes are configured in the `routes` section under the network interface. Use `to` for the destination network and `via` when the route goes through a gateway. Apply with `netplan apply`. Routes are persistent and automatically applied at boot by systemd-networkd or NetworkManager.
