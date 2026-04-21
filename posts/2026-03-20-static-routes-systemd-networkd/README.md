# How to Configure Static Routes with systemd-networkd - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, Static Routes, systemd-networkd, IPv4, Routing

Description: Learn how to configure persistent static routes on Linux using systemd-networkd network unit files, including routes to specific subnets and metric-based routing.

## Introduction

Static routes tell the kernel how to reach specific networks that are not covered by the default route. With `systemd-networkd`, static routes are defined in `.network` unit files and persist across reboots automatically.

## Basic Static Route Configuration

Create or edit a `.network` file:

```bash
sudo nano /etc/systemd/network/10-static.network
```

Add a `[Route]` section for each static route:

```ini
[Match]
Name=ens3

[Network]
Address=192.168.1.100/24
Gateway=192.168.1.1
DNS=8.8.8.8

[Route]
Gateway=192.168.1.254
Destination=10.20.0.0/16

[Route]
Gateway=192.168.1.254
Destination=172.16.0.0/12
```

## Multiple Static Routes

Each `[Route]` section defines one route. Add as many as needed:

```ini
[Route]
Gateway=192.168.1.254
Destination=10.0.0.0/8

[Route]
Gateway=192.168.1.253
Destination=172.16.0.0/12

[Route]
Gateway=192.168.1.252
Destination=192.168.100.0/24
```

## Setting Route Metrics

Use the `Metric=` option to control route preference (lower metric = higher priority):

```ini
[Route]
Gateway=192.168.1.1
Destination=0.0.0.0/0
Metric=100

[Route]
Gateway=192.168.1.254
Destination=0.0.0.0/0
Metric=200
```

## IPv6 Static Routes

The same syntax works for IPv6:

```ini
[Route]
Gateway=2001:db8::1
Destination=2001:db8:1::/48
```

## Applying the Configuration

```bash
sudo systemctl restart systemd-networkd
```

## Verifying Routes

```bash
ip route show
# or

routel
```

Check a specific route:

```bash
ip route get 10.20.5.10
```

## Removing Routes

Remove the `[Route]` section from the `.network` file and restart systemd-networkd. To temporarily remove without editing files:

```bash
sudo ip route del 10.20.0.0/16 via 192.168.1.254
```

This will be reverted after the next networkd restart.

## Conclusion

`systemd-networkd` makes static route management clean and declarative through `.network` unit files. Routes defined this way survive reboots and network restarts, making them reliable for production server environments.
