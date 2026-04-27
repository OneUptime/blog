# How to Configure OSPFv3 on Linux with BIRD

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OSPFv3, BIRD, Linux, IPv6, Routing

Description: Learn how to configure OSPFv3 on Linux using the BIRD routing daemon, including basic setup, multi-area configuration, and verification.

## Overview

BIRD (BIRD Internet Routing Daemon) is a lightweight and feature-rich routing daemon for Linux. It supports OSPFv3 natively and uses a clean, declarative configuration syntax. BIRD2 (version 2.x) supports both IPv4 and IPv6 in a unified configuration.

## Installation

```bash
# Debian/Ubuntu

sudo apt install bird2

# RHEL/CentOS/Fedora
sudo dnf install bird

# Verify installation
bird --version
```

## Basic OSPFv3 Configuration (BIRD2)

```bash
# /etc/bird/bird.conf

# Set the Router ID
router id 1.1.1.1;

# Log to syslog
log syslog all;

# Protocol: device (required - monitors network interfaces from the kernel)
protocol device {
    scan time 10;
}

# Protocol: direct (generates routes for directly connected networks)
protocol direct {
    ipv6;
    interface "eth0", "eth1", "lo";
}

# Protocol: kernel (exports routes to Linux kernel)
protocol kernel {
    ipv6 {
        export all;
        import all;
    };
}

# Protocol: OSPFv3
protocol ospf v3 OSPF_V6 {
    ipv6;

    area 0.0.0.0 {
        interface "eth0" {
            type broadcast;
            hello 10;
            dead count 4;
            cost 10;
        };

        interface "eth1" {
            type broadcast;
            hello 10;
            dead count 4;
        };

        interface "lo" {
            stub yes;  # Loopback is passive
        };
    };
}
```

## Multi-Area Configuration

```text
# /etc/bird/bird.conf - OSPFv3 with Area 0 and Area 1

protocol ospf v3 OSPF_V6 {
    ipv6;

    area 0.0.0.0 {
        interface "eth0" {
            type broadcast;
        };
    };

    area 0.0.0.1 {
        interface "eth1" {
            type broadcast;
        };
        stub no;       # Not a stub area
    };
}
```

## Stub Area Configuration

```text
protocol ospf v3 OSPF_V6 {
    ipv6;

    area 0.0.0.0 {
        interface "eth0" { type broadcast; };
    };

    area 0.0.0.1 {
        stub yes;         # Configure as stub area
        default cost 20;  # Cost of the default route injected

        interface "eth1" { type broadcast; };
    };
}
```

## Route Filtering with Export Filters

```bash
# Export only specific prefixes into OSPFv3
filter OSPF_EXPORT {
    if net ~ [ 2001:db8::/32+ ] then accept;
    reject;
}

protocol ospf v3 OSPF_V6 {
    ipv6 {
        export filter OSPF_EXPORT;
        import all;
    };
    area 0.0.0.0 {
        interface "eth0";
    };
}
```

## Starting and Managing BIRD

```bash
# Start BIRD
sudo systemctl enable --now bird

# Reload configuration without restart
sudo birdc configure

# Or send a SIGHUP
sudo kill -HUP $(pidof bird)
```

## Verification with birdc

```bash
# Connect to the BIRD control socket
sudo birdc

# In birdc:
# Show OSPFv3 neighbors
show ospf neighbors OSPF_V6

# Show OSPFv3 state
show ospf state OSPF_V6

# Show OSPFv3 topology database
show ospf topology OSPF_V6

# Show routes imported from OSPFv3
show route protocol OSPF_V6

# Show all routes in the kernel
show route
```

## Summary

BIRD2 OSPFv3 is configured in `/etc/bird/bird.conf` using the `protocol ospf v3` block. Assign interfaces to areas, set hello/dead timers, and use `stub yes` for passive interfaces. Apply route filters with export/import filters. Manage and verify with `birdc` commands.
