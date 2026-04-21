# How to Add a Static Route with a Specific Metric on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Static Routes, Metric, Routing, iproute2, Networking, Failover

Description: Add static routes with custom metric values on Linux to control route preference, implement backup routing, and manage traffic when multiple paths exist.

## Introduction

Route metric determines the preference between multiple equally specific routes to the same destination. The route with the lowest metric is preferred. Setting custom metrics allows you to create primary/backup routing policies without dynamic routing protocols.

## Add a Route with a Specific Metric

```bash
# Add a route with metric 100 (lower = preferred)

ip route add 192.168.2.0/24 via 10.0.0.1 metric 100

# Add a backup route with higher metric (used if primary fails)
ip route add 192.168.2.0/24 via 10.0.1.1 metric 200
```

## View Routes with Metrics

```bash
# Show all routes with metrics
ip route show
# 192.168.2.0/24 via 10.0.0.1 dev eth0 metric 100
# 192.168.2.0/24 via 10.0.1.1 dev eth1 metric 200
```

## Default Gateway with Metric

```bash
# Primary default route
ip route add default via 192.168.1.1 metric 100

# Backup default route (used when primary is unavailable)
ip route add default via 192.168.1.254 metric 200
```

## Route Selection Based on Metric

Linux uses the most specific route first, then selects the lowest metric when multiple equally specific routes match:

```bash
# Check which route will be used
ip route get 192.168.2.100
# Shows the selected matching route
```

## Persistent Configuration with Metrics

### Netplan

```yaml
routes:
  - to: 192.168.2.0/24
    via: 10.0.0.1
    metric: 100

  - to: 192.168.2.0/24
    via: 10.0.1.1
    metric: 200
```

### nmcli (RHEL)

```bash
# Add route with metric
nmcli connection modify eth0 \
    +ipv4.routes "192.168.2.0/24 10.0.0.1 100"

# Add backup route
nmcli connection modify eth1 \
    +ipv4.routes "192.168.2.0/24 10.0.1.1 200"
```

### systemd-networkd

```ini
[Route]
Destination=192.168.2.0/24
Gateway=10.0.0.1
Metric=100
```

## Change a Route's Metric

```bash
# Delete the old metric and add the route with the new metric
ip route del 192.168.2.0/24 via 10.0.0.1 metric 100
ip route add 192.168.2.0/24 via 10.0.0.1 metric 50
```

## Automatic Failover Simulation

Routes with metrics don't automatically failover - that requires link detection. For true failover, pair with dead gateway detection or interface monitoring:

```bash
# Add both routes - lower metric preferred
ip route add default via 10.0.0.1 metric 100
ip route add default via 10.0.1.1 metric 200

# If eth0 goes DOWN and its lower-metric route is removed,
# eth1's route (metric 200) then becomes active
```

## Conclusion

Route metrics control preference when multiple equally specific routes exist to the same destination. Lower metric = preferred. Use `metric <number>` with `ip route add` to set the priority. Primary routes should have metric 100 (or similar) and backups a higher value. When the lower-metric route is removed, Linux falls back to the next-lowest-metric route. Always persist routes with metrics via Netplan, nmcli, or systemd-networkd.
