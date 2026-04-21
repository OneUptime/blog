# How to Configure a Static IPv4 Address with Netplan - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, Netplan, Ubuntu, Network Configuration

Description: Learn how to configure a static IPv4 address on Ubuntu and other Linux systems using Netplan, including setting a gateway, DNS servers, and applying the changes.

## Introduction

Netplan is the default network configuration utility on Ubuntu 18.04 and later. It uses YAML files to define network configuration and delegates the actual work to systemd-networkd or NetworkManager. Configuring a static IPv4 address with Netplan is straightforward and the changes persist across reboots.

## Finding Your Interface Name

```bash
ip link show
# or

ip -br link
```

Common names: `eth0`, `ens3`, `enp3s0`, `ens18`.

## Netplan Configuration File Location

Netplan configuration files live in `/etc/netplan/`. List existing files:

```bash
ls /etc/netplan/
```

You may see a file like `00-installer-config.yaml` or `01-netcfg.yaml`.

## Configuring a Static IP Address

Edit or create a Netplan configuration file:

```bash
sudo nano /etc/netplan/01-netcfg.yaml
```

Add the following configuration:

```yaml
network:
  version: 2
  ethernets:
    ens3:
      dhcp4: false
      addresses:
        - 192.168.1.100/24
      routes:
        - to: default
          via: 192.168.1.1
      nameservers:
        addresses:
          - 8.8.8.8
          - 8.8.4.4
        search:
          - example.local
```

Replace `ens3` with your interface name, `192.168.1.100/24` with your desired IP and prefix, and `192.168.1.1` with your gateway.

If you are specifically on Ubuntu 18.04, replace the `routes` block with `gateway4: 192.168.1.1`; Netplan in that release does not support `to: default`.

## Applying the Configuration

Test the configuration first (reverts after 120 seconds if you don't confirm):

```bash
sudo netplan try
```

If it works, press Enter to confirm, or apply directly:

```bash
sudo netplan apply
```

## Verifying the Configuration

```bash
ip -4 addr show ens3
ip route show
```

Test connectivity:

```bash
ping -c 4 8.8.8.8
ping -c 4 google.com
```

## Troubleshooting

If the configuration fails to apply:

```bash
sudo netplan --debug apply
```

Check for YAML syntax errors - Netplan is strict about indentation (use spaces, not tabs).

## Setting Multiple IP Addresses

```yaml
addresses:
  - 192.168.1.100/24
  - 192.168.1.101/24
```

## Conclusion

Netplan makes static IPv4 configuration clean and declarative. The YAML configuration file approach ensures your network settings are easy to review, modify, and include in configuration management tools like Ansible.
