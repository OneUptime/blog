# How to Run DHCPv6 Alongside DHCPv4 for Dual-Stack Networks

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, DHCPv4, Dual-Stack, IPv6, IPv4, Network Administration

Description: Configure ISC DHCP server to provide both DHCPv4 and DHCPv6 address assignment on the same network, enable SLAAC with DHCPv6 stateless, and manage dual-stack leases.

## Introduction

Dual-stack networks need both IPv4 address assignment (DHCPv4) and IPv6 address assignment (DHCPv6 stateful or stateless). These run as separate `dhcpd` processes on the same server. You can also combine DHCPv6 with SLAAC (Stateless Address Autoconfiguration) using Router Advertisements.

## DHCPv4 Configuration

```bash
# /etc/dhcp/dhcpd.conf

authoritative;

subnet 10.0.0.0 netmask 255.255.255.0 {
    range 10.0.0.100 10.0.0.200;
    option domain-name "example.com";
    option domain-name-servers 10.0.0.1, 8.8.8.8;
    option routers 10.0.0.1;
    default-lease-time 86400;
    max-lease-time 604800;
}
```

## DHCPv6 Configuration

```bash
# /etc/dhcp/dhcpd6.conf

# DHCPv6 server

# Valid lifetime defaults and limits
default-lease-time 86400;
max-lease-time 604800;

# DNS servers (IPv6 addresses of DNS servers)
option dhcp6.name-servers 2001:4860:4860::8888, 2001:4860:4860::8844;
option dhcp6.domain-search "example.com";

subnet6 2001:db8:1234:1::/64 {
    # Stateful DHCPv6 address range
    range6 2001:db8:1234:1::100 2001:db8:1234:1::200;

    # DNS servers for this subnet
    option dhcp6.name-servers 2001:db8:1234:1::1;
}
```

## Starting Both DHCP Daemons

```bash
# Debian/Ubuntu packaging uses one service name for both instances.
# Configure the interfaces in /etc/default/isc-dhcp-server:
# INTERFACESv4="eth0"
# INTERFACESv6="eth0"

# Start the service, which launches separate dhcpd -4 and dhcpd -6 processes
sudo systemctl enable --now isc-dhcp-server
```

## DHCPv6 Stateless with SLAAC (Recommended)

```bash
# Stateless DHCPv6 provides only network info (DNS, domain)
# IPv6 addresses are assigned by SLAAC from Router Advertisements

# /etc/radvd.conf (Router Advertisement Daemon)
interface eth0 {
    AdvSendAdvert on;
    MinRtrAdvInterval 3;
    MaxRtrAdvInterval 10;

    # M=0: no stateful address assignment (use SLAAC)
    # O=1: stateless config available (DNS via DHCPv6)
    AdvManagedFlag off;
    AdvOtherConfigFlag on;    # Tell clients to get info from DHCPv6

    prefix 2001:db8:1234:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;     # SLAAC
    };
};
```

```bash
# /etc/dhcp/dhcpd6.conf - stateless mode
subnet6 2001:db8:1234:1::/64 {
    # No range6 - no stateful addresses
    # Only provide configuration info:
    option dhcp6.name-servers 2001:db8:1234:1::1;
    option dhcp6.domain-search "example.com";
}
```

## Managing Dual-Stack Leases

```bash
# View DHCPv4 leases
sudo cat /var/lib/dhcp/dhcpd.leases

# View DHCPv6 leases
sudo cat /var/lib/dhcp/dhcpd6.leases

# Check active DHCPv4 leases
sudo dhcp-lease-list

# Restart both DHCP instances after config changes
sudo systemctl restart isc-dhcp-server
```

## Testing Dual-Stack Assignment

```bash
# Test DHCPv4 (from a client)
sudo dhclient -4 eth0
ip -4 address show eth0  # Should show 10.0.0.x

# Test stateful DHCPv6 (from a client)
sudo dhclient -6 eth0
ip -6 address show eth0  # Should show 2001:db8:... address

# Test stateless DHCPv6 + SLAAC
sudo dhclient -6 -S eth0   # Request DHCPv6 information only
sudo rdisc6 eth0           # Listen for Router Advertisements
ip -6 address show eth0 | grep "scope global"  # Shows SLAAC address
```

## Conclusion

Dual-stack DHCP requires separate DHCPv4 and DHCPv6 `dhcpd` processes. For stateful DHCPv6, configure a `range6` in `dhcpd6.conf`. For stateless DHCPv6 (DNS only, addresses from SLAAC), set `AdvManagedFlag off` and `AdvOtherConfigFlag on` in `radvd.conf`. Both approaches allow IPv4 addresses to continue coming from DHCPv4 while IPv6 addresses come from either DHCPv6 or SLAAC.
