# How to Configure a Default Gateway with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Netplan, Ubuntu, Default Gateway, Routing, Networking

Description: Configure the default gateway on Ubuntu and Debian systems using Netplan YAML, including single gateway, gateway with metric, and multi-homed gateway setup.

## Introduction

In Netplan, the default gateway is set under `routes` using `to: default` (or `to: 0.0.0.0/0`) with a `via` pointing to the gateway IP. This replaces the older `gateway4` key which was deprecated in Netplan 0.103+.

## Set Default Gateway (Recommended Method)

```yaml
# /etc/netplan/01-netcfg.yaml

network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
```

```bash
netplan apply
ip route show default
```

## Explicit 0.0.0.0/0 Syntax

```yaml
routes:
  - to: 0.0.0.0/0
    via: 192.168.1.1
```

Both `to: default` and `to: 0.0.0.0/0` achieve the same result.

## Default Gateway with Metric

```yaml
routes:
  - to: default
    via: 192.168.1.1
    metric: 100
```

Lower metric = higher priority. Useful for multi-homed servers.

## Multiple Default Gateways (Multi-Homed)

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: false
      addresses:
        - 10.0.0.10/24
      routes:
        - to: default
          via: 10.0.0.1
          metric: 100
    eth1:
      dhcp4: false
      addresses:
        - 10.0.1.10/24
      routes:
        - to: default
          via: 10.0.1.1
          metric: 200
```

Traffic uses eth0's gateway (metric 100) as primary, eth1's (metric 200) as secondary.

## Deprecated gateway4 (Do Not Use)

```yaml
# OLD way (deprecated, still works but avoid)
network:
  version: 2
  ethernets:
    eth0:
      gateway4: 192.168.1.1  # deprecated
```

Use `routes` with `to: default` instead.

## Verify the Default Gateway

```bash
# Show default routes
ip route show default

# Show all routes
ip route show

# Test internet connectivity
ping -c 3 8.8.8.8
```

## Change the Default Gateway

```bash
# Update the via address in the Netplan file
# Then apply
netplan apply
```

## Conclusion

Set the default gateway in Netplan using `routes` with `to: default` and `via: <gateway-ip>`. Add a `metric` to control priority when multiple default routes exist. Avoid the deprecated `gateway4` key. Apply with `netplan apply` and verify with `ip route show default`.
