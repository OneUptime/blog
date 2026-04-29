# How to Configure IPv6 Stateful Router with DHCPv6

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: IPv6, DHCPv6, Router, Linux, Stateful, Networking

Description: Configure a Linux IPv6 router with stateful DHCPv6 address assignment, where the router maintains a lease database and assigns specific IPv6 addresses to clients.

## Introduction

A stateful IPv6 router uses DHCPv6 to assign addresses to clients, similar to DHCP in IPv4. The router sends Router Advertisements with M=1 (Managed flag), indicating that addresses are available via DHCPv6. This approach provides central control over address assignments and lease tracking.

## When to Use Stateful vs. Stateless

| Scenario | Recommended Mode |
|---|---|
| Home/small office | Stateless (SLAAC + RDNSS) |
| Enterprise (need address control) | Stateful DHCPv6 |
| Fixed address per device | Stateful DHCPv6 with reservations |
| RADIUS/AAA integration | Stateful DHCPv6 |
| Forensics / compliance | Stateful (lease logs) |

## Components Required

1. **radvd** - sends RA with M=1 to indicate DHCPv6 address assignment is available
2. **isc-dhcp-server** or **kea** - the DHCPv6 server that assigns addresses

## Step 1: Enable IPv6 Forwarding

```bash
sudo sysctl -w net.ipv6.conf.all.forwarding=1
echo "net.ipv6.conf.all.forwarding = 1" | sudo tee /etc/sysctl.d/50-ipv6-forward.conf
```

## Step 2: Configure radvd with M=1

```text
# /etc/radvd.conf - Stateful DHCPv6 mode

interface eth1 {
    AdvSendAdvert on;

    # M=1: indicate that addresses are available via DHCPv6
    AdvManagedFlag on;

    # O=1: advertise DHCPv6 for DNS and other options
    AdvOtherConfigFlag on;

    MinRtrAdvInterval 30;
    MaxRtrAdvInterval 100;
    AdvDefaultLifetime 1800;

    # Still advertise the prefix for on-link determination
    # but AdvAutonomous off so hosts don't form SLAAC addresses from it
    prefix 2001:db8:1:1::/64 {
        AdvOnLink on;
        AdvAutonomous off;    # Disable SLAAC for this prefix
        AdvValidLifetime 86400;
        AdvPreferredLifetime 14400;
    };
};
```

## Step 3: Configure ISC DHCPv6 Server

```bash
sudo apt-get install isc-dhcp-server
```

```text
# /etc/dhcp/dhcpd6.conf - Stateful DHCPv6 configuration

# Global options

default-lease-time 86400;
preferred-lifetime 14400;
option dhcp-renewal-time 7200;
option dhcp-rebinding-time 10800;

# Global authoritative setting for this server
authoritative;

# DHCPv6 subnet
subnet6 2001:db8:1:1::/64 {
    # Address pool for dynamic assignment
    range6 2001:db8:1:1::1000 2001:db8:1:1::1fff;

    # DNS options delivered via DHCPv6
    option dhcp6.name-servers 2001:db8:1:1::53, 2606:4700:4700::1111;
    option dhcp6.domain-search "example.com", "internal.example.com";

    # NTP server
    option dhcp6.sntp-servers 2001:db8:1:1::123;
}
```

## Step 4: Configure Static Reservations

```text
# /etc/dhcp/dhcpd6.conf - Add static reservations by DUID

# Reserve a specific address for a known client
host webserver {
    # Match the client's DHCPv6 DUID (example shown is a DUID-LL)
    host-identifier option dhcp6.client-id 00:03:00:01:00:11:22:33:44:55;
    fixed-address6 2001:db8:1:1::10;
}
```

## Step 5: Start the DHCPv6 Server

```bash
# Configure the server to listen on eth1
# /etc/default/isc-dhcp-server
# INTERFACESv6="eth1"

sudo systemctl enable --now isc-dhcp-server6
sudo systemctl status isc-dhcp-server6
```

## Step 6: Verify Lease Assignment

```bash
# Check the DHCPv6 lease database
cat /var/lib/dhcp/dhcpd6.leases

# Monitor DHCP requests in real time
sudo journalctl -u isc-dhcp-server6 -f

# From a client, verify DHCPv6 address was obtained
# Linux client with dhcpcd:
sudo dhcpcd -6 eth0

# Or check with systemd-networkd:
networkctl status eth0
```

## Using Kea Instead of ISC DHCP

Kea is the modern replacement for ISC DHCP:

```json
// /etc/kea/kea-dhcp6.conf (abbreviated)
{
    "Dhcp6": {
        "interfaces-config": {
            "interfaces": ["eth1"]
        },
        "subnet6": [{
            "subnet": "2001:db8:1:1::/64",
            "pools": [{
                "pool": "2001:db8:1:1::1000 - 2001:db8:1:1::1fff"
            }],
            "option-data": [{
                "name": "dns-servers",
                "data": "2001:db8:1:1::53"
            }]
        }]
    }
}
```

## Conclusion

A stateful DHCPv6 router on Linux combines radvd (with M=1) and a DHCPv6 server (ISC or Kea) to provide centrally managed IPv6 address assignment. The RA's M flag signals that DHCPv6 address assignment is available, the DHCPv6 server assigns addresses from a pool and maintains lease records, and static reservations allow fixed assignment for servers and critical devices. This approach provides the audit trail and address control that enterprise environments require.
