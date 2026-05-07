# How to Add Static Routes with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Netplan, Ubuntu, Static Routes, Routing, Networking

Description: Add persistent static routes to Ubuntu and Debian systems using Netplan YAML configuration, including network routes, host routes, and routes with metrics.

## Introduction

Netplan defines static routes under the `routes` key for each interface. Routes are applied when the interface comes up and support destination, gateway, metric, and route type. Apply changes with `netplan apply`.

## Add a Static Route

```yaml
# /etc/netplan/01-netcfg.yaml

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
        # Route to 192.168.50.0/24 via a specific gateway
        - to: 192.168.50.0/24
          via: 10.0.0.2
```

```bash
netplan apply
ip route show
```

## Multiple Static Routes

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
        - to: 192.168.50.0/24
          via: 10.0.0.2
        - to: 172.16.0.0/16
          via: 10.0.0.3
        - to: 10.20.0.0/24
          via: 10.0.0.4
          metric: 200
```

## Route with Metric

```yaml
routes:
  - to: 192.168.50.0/24
    via: 10.0.0.2
    # Lower metric = higher priority
    metric: 100
```

## Host Route (Single IP)

```yaml
routes:
  - to: 10.5.5.5/32
    via: 10.0.0.2
```

## Blackhole Route

```yaml
routes:
  - to: 192.168.99.0/24
    type: blackhole
```

## Route with Source Address Hint

```yaml
routes:
  - to: 192.168.50.0/24
    via: 10.0.0.2
    from: 10.0.0.10
```

## DHCP with Additional Static Routes

```yaml
network:
  version: 2
  ethernets:
    eth0:
      dhcp4: true
      routes:
        # Static routes added on top of DHCP-assigned routes
        - to: 192.168.100.0/24
          via: 10.0.0.2
```

## Apply and Verify

```bash
# Apply configuration
netplan apply

# Check routes
ip route show

# Check route selection for a specific destination
ip route get 192.168.50.1
```

## Conclusion

Netplan static routes go under the `routes` key for each interface. Each route needs at minimum `to` (destination). Routed entries typically also include `via` (gateway). Optional fields include `metric`, `type` (blackhole, unreachable), and `from` (source hint). Apply with `netplan apply` and verify with `ip route show`.
