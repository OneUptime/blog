# How to Configure Multiple IPv4 Addresses with Netplan

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Netplan, IPv4, Linux, Networking, Ubuntu, YAML

Description: Configure multiple IPv4 addresses on a single network interface using Netplan's YAML-based configuration on Ubuntu and Debian-based systems.

## Introduction

Netplan is the default network configuration utility for Ubuntu 18.04 and later. It uses YAML descriptors to configure network interfaces, supporting multiple IP addresses on a single interface - useful for hosting multiple services or migrating addresses.

## Prerequisites

- Ubuntu 18.04 or later (or any distro using Netplan)
- Root or sudo access
- The interface name (use `ip link show` to find it)

## Configuring Multiple IPv4 Addresses

Netplan configuration files live in `/etc/netplan/`. Edit or create a file such as `01-netcfg.yaml`.

The following example assigns two IPv4 addresses to `eth0` along with a default gateway and DNS servers:

```yaml
# /etc/netplan/01-netcfg.yaml

network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - 192.168.1.10/24   # Primary IPv4 address
        - 192.168.1.11/24   # Secondary IPv4 address
      routes:
        - to: default
          via: 192.168.1.1  # Default gateway
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
```

## Applying the Configuration

After saving the file, validate and apply the configuration:

```bash
# Apply temporarily and auto-revert if not confirmed
sudo netplan try

# Apply the configuration permanently
sudo netplan apply
```

`netplan try` applies the configuration temporarily and reverts if you don't confirm within 120 seconds - a safety net to avoid locking yourself out.

## Verifying the Addresses

Confirm both addresses are active on the interface:

```bash
# Show all addresses assigned to eth0
ip addr show eth0
```

You should see both `192.168.1.10/24` and `192.168.1.11/24` listed under `eth0`.

## Adding Addresses on Different Subnets

You can also assign addresses from different subnets to the same interface:

```yaml
# /etc/netplan/01-netcfg.yaml
network:
  version: 2
  renderer: networkd
  ethernets:
    eth0:
      addresses:
        - 192.168.1.10/24    # LAN subnet
        - 10.0.0.100/8       # Management subnet
      routes:
        - to: default
          via: 192.168.1.1
```

## Monitoring with OneUptime

Once your addresses are active, use [OneUptime](https://oneuptime.com) to monitor availability of services bound to each IP, ensuring you catch issues before they affect production traffic.

## Conclusion

Netplan makes it straightforward to assign multiple IPv4 addresses using clean YAML syntax. Always use `netplan try` before `netplan apply` to safely test changes.
