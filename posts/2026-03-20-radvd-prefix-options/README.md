# How to Configure radvd Prefix Options

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, Radvd, Prefix, SLAAC, Router Advertisement, Networking

Description: Configure radvd prefix options to control how IPv6 clients autoconfigure their addresses, including on-link status, autonomous flag, and address lifetimes.

## Introduction

The `prefix` block in radvd's configuration is the most important part of the Router Advertisement for SLAAC deployments. It tells clients which prefix to use for address autoconfiguration, how long the addresses are valid, and whether the prefix is directly reachable on the local link.

## Key Prefix Options

| Option | Type | Description |
|---|---|---|
| `AdvOnLink` | bool | Prefix is on-link (reachable directly without routing) |
| `AdvAutonomous` | bool | Clients can form addresses using SLAAC |
| `AdvRouterAddr` | bool | Advertise the interface address instead of a network prefix (Mobile IPv6) |
| `AdvValidLifetime` | seconds | How long the prefix remains valid for on-link determination and SLAAC |
| `AdvPreferredLifetime` | seconds | How long the address is preferred for new connections |
| `DeprecatePrefix` | bool | Deprecate the prefix in radvd's shutdown RA |
| `DecrementLifetimes` | bool | Decrement lifetimes in each RA to track prefix aging |
| `Base6to4Interface` | iface | Generate prefix from a 6to4 interface |

## Standard SLAAC Prefix Configuration

```text
# /etc/radvd.conf

# Standard prefix configuration for client address autoconfiguration

interface eth1 {
    AdvSendAdvert on;
    AdvManagedFlag off;
    AdvOtherConfigFlag off;

    prefix 2001:db8:1:1::/64 {
        # Clients can reach each other directly (no routing needed)
        AdvOnLink on;

        # Clients can use this prefix to form their own IPv6 addresses
        AdvAutonomous on;

        # Address is valid for 24 hours
        AdvValidLifetime 86400;

        # Address is preferred for new connections for 4 hours
        AdvPreferredLifetime 14400;
    };
};
```

## Prefix-Only (No Autonomous Addressing)

For networks where DHCPv6 provides all addresses and the prefix is only used for on-link determination:

```text
prefix 2001:db8:1:2::/64 {
    AdvOnLink on;

    # Do NOT allow SLAAC - all addresses come from DHCPv6
    AdvAutonomous off;

    AdvValidLifetime 86400;
    AdvPreferredLifetime 14400;
};
```

This is used when `AdvManagedFlag on` is set and all addressing is managed via DHCPv6.

## Deprecating a Prefix (Network Renumbering)

When renumbering a network, advertise the new prefix and deprecate the old one by setting its preferred lifetime to `0`:

```text
# New prefix - fully advertised
prefix 2001:db8:2:1::/64 {
    AdvOnLink on;
    AdvAutonomous on;
    AdvValidLifetime 86400;
    AdvPreferredLifetime 14400;
};

# Old prefix - being deprecated
# Set preferred lifetime to 0 to immediately deprecate
# Set valid lifetime low for gradual removal
prefix 2001:db8:1:1::/64 {
    AdvOnLink on;
    AdvAutonomous on;
    AdvValidLifetime 3600;      # Only valid for 1 more hour
    AdvPreferredLifetime 0;     # Immediately deprecated - no new connections
};
```

## Using DecrementLifetimes for Controlled Expiry

The `DecrementLifetimes` option causes radvd to count down the lifetime in each RA, so clients see the prefix aging naturally. This is mainly useful when the advertised prefix lifetime should track a delegated prefix:

```text
prefix 2001:db8:1:1::/64 {
    AdvOnLink on;
    AdvAutonomous on;
    AdvValidLifetime 7200;
    AdvPreferredLifetime 3600;
    # Decrement these values with each RA so clients see them counting down
    DecrementLifetimes on;
};
```

## Advertising Multiple Prefixes

A single interface can advertise multiple prefixes - useful for multi-homed or transitional setups:

```text
interface eth1 {
    AdvSendAdvert on;

    # Primary prefix
    prefix 2001:db8:1:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };

    # Secondary prefix (e.g., from a different ISP)
    prefix 2001:db8:3:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };
};
```

## Verifying Prefix Options Are Received by Clients

```bash
# On a client, use rdisc6 to see what the router is advertising
rdisc6 eth0

# Check what prefixes the client has acted on
ip -6 addr show scope global

# If privacy extensions are enabled, look for temporary addresses
ip -6 addr show | grep temporary
```

## Conclusion

radvd prefix options give precise control over how clients autoconfigure IPv6 addresses. The combination of `AdvOnLink`, `AdvAutonomous`, and the lifetime values drives the client's address selection policy. During network renumbering, use a zero preferred lifetime and a reduced valid lifetime to gracefully transition clients to new addresses. Use `DecrementLifetimes` when the advertised prefix should age alongside a delegated prefix, and `DeprecatePrefix` when you want radvd's shutdown RA to deprecate the prefix.
