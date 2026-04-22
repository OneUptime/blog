# How to Show IPv4 Addresses Using `ip -4 addr`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Linux, Networking, IPv4, CLI, ip command, Network Administration

Description: Learn how to use the `ip -4 addr` command on Linux to display only IPv4 addresses assigned to network interfaces, along with useful filtering and formatting options.

## Introduction

The `ip` command is the modern replacement for `ifconfig` on Linux systems. Using `ip -4 addr` restricts the output to IPv4 addresses only, which is useful when you want a clean view of your IPv4 network configuration without IPv6 clutter.

## Basic Usage

Display all IPv4 addresses on all interfaces:

```bash
ip -4 addr
```

Sample output:

```text
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536 qdisc noqueue state UNKNOWN group default
    inet 127.0.0.1/8 scope host lo
       valid_lft forever preferred_lft forever
2: eth0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc fq_codel state UP group default
    inet 192.168.1.100/24 brd 192.168.1.255 scope global dynamic eth0
       valid_lft 86354sec preferred_lft 86354sec
```

## Show Addresses for a Specific Interface

```bash
ip -4 addr show eth0
```

## Show Only the IP Address (No Extra Details)

Combine with `grep` and `awk` for scripting:

```bash
ip -4 addr show eth0 | grep inet | awk '{print $2}'
```

Output:

```text
192.168.1.100/24
```

## Strip the Prefix Length

To get just the IP address without the CIDR prefix:

```bash
ip -4 addr show eth0 | grep inet | awk '{print $2}' | cut -d/ -f1
```

Output:

```text
192.168.1.100
```

## List All IPv4 Addresses

```bash
ip -4 addr show | grep -oP '(?<=inet\s)\d+(\.\d+){3}'
```

## Short Output Format

Use the `-brief` or `-br` flag for a condensed view:

```bash
ip -4 -br addr
```

Output:

```text
lo               UNKNOWN        127.0.0.1/8
eth0             UP             192.168.1.100/24
```

## Useful Options Summary

| Option | Description |
|--------|-------------|
| `-4`   | Show only IPv4 |
| `-6`   | Show only IPv6 |
| `-br`  | Brief output |
| `-s`   | Show statistics |
| `show <iface>` | Filter by interface |

## Conclusion

`ip -4 addr` is a quick and reliable way to inspect IPv4 assignments on Linux systems. Its output can be further refined with shell tools for use in scripts and automation pipelines.
