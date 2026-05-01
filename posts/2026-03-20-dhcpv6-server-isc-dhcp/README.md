# How to Configure a DHCPv6 Server with ISC dhcpd

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, ISC dhcpd, Linux, IPv6, DHCP Server, Dhcp6

Description: Configure ISC dhcpd as a DHCPv6 server on Linux with subnet definitions, address pools, host reservations, and prefix delegation using the classic dhcpd6.conf syntax.

## Introduction

ISC dhcpd (the original ISC DHCP server) supports DHCPv6 via a separate daemon invocation (`dhcpd -6`). ISC DHCP is now end-of-life and ISC recommends migrating to Kea for new deployments, but dhcpd remains widely deployed and its configuration syntax is familiar. This guide covers DHCPv6 configuration with dhcpd including subnet definitions, address pools, host reservations, and prefix delegation.

## Installation

```bash
# Debian/Ubuntu

sudo apt-get install isc-dhcp-server

# RHEL/CentOS
sudo dnf install dhcp-server

# Check version
dhcpd --version
```

## Basic dhcpd6.conf Configuration

```bash
cat > /etc/dhcp/dhcpd6.conf << 'EOF'
# DHCPv6 server configuration

# Default and max lease times (seconds)
default-lease-time 3600;      # 1 hour valid lifetime
max-lease-time 86400;         # 24 hour maximum valid lifetime
preferred-lifetime 3000;

# DHCPv6 lease database override (Debian/Ubuntu path shown)
dhcpv6-lease-file-name "/var/lib/dhcp/dhcpd6.leases";

# Log DHCPv6 activity
log-facility local7;

# Global options (sent to all clients)
option dhcp6.domain-search "corp.example.com", "example.com";
option dhcp6.name-servers 2001:4860:4860::8888, 2001:4860:4860::8844;

# DHCPv6 subnet definition
subnet6 2001:db8::/64 {
    # Address pool for dynamic assignment
    range6 2001:db8::100 2001:db8::200;

    # Subnet-specific options (override global)
    option dhcp6.name-servers 2001:db8::53;
    option dhcp6.domain-search "corp.example.com";
}
EOF

# Create empty leases file if it doesn't exist (Debian/Ubuntu path shown)
sudo touch /var/lib/dhcp/dhcpd6.leases

# Start DHCPv6 server on eth1
sudo dhcpd -6 -cf /etc/dhcp/dhcpd6.conf eth1

# Or configure systemd service on Debian/Ubuntu
# /etc/default/isc-dhcp-server:
# INTERFACESv6="eth1"
sudo systemctl start isc-dhcp-server6
sudo systemctl enable isc-dhcp-server6
```

## Host Reservations

```bash
# Reserve specific addresses for known clients (identified by DUID)
cat >> /etc/dhcp/dhcpd6.conf << 'EOF'

# Host reservation by DUID
host server1 {
    host-identifier option dhcp6.client-id
        00:01:00:01:ab:cd:ef:01:aa:bb:cc:dd:ee:ff;
    fixed-address6 2001:db8::10;
    option dhcp6.name-servers 2001:db8::53;
}

# Host reservation for printer
host printer1 {
    host-identifier option dhcp6.client-id
        00:02:00:00:ab:11:22:33:44:55;
    fixed-address6 2001:db8::50;
}
EOF

# Find a client's DUID
# On Linux clients using dhcpcd: cat /var/lib/dhcpcd/duid
# Or inspect the DHCPv6 client logs or lease state on the client
```

## Stateless DHCPv6 (INFO-REQUEST only)

```bash
# Stateless DHCPv6: provide options without address assignment
# Commonly used when RA has M=0, O=1
cat > /etc/dhcp/dhcpd6.conf << 'EOF'
# Stateless DHCPv6 server
# Responds to INFO-REQUEST with DNS/options only (no address assignment)

option dhcp6.domain-search "corp.example.com";
option dhcp6.name-servers 2001:4860:4860::8888;

subnet6 2001:db8::/64 {
    # No range6 statement = no address assignment (stateless)
    # Only responds to INFO-REQUEST
}
EOF
```

## Prefix Delegation with dhcpd

```bash
cat >> /etc/dhcp/dhcpd6.conf << 'EOF'

# Prefix delegation pool
# Delegates /56 prefixes from the configured range
prefix6 2001:db8:: 2001:db8:ff:: /56;

# Host-specific prefix delegation
host cpe-router1 {
    host-identifier option dhcp6.client-id
        00:01:00:01:12:34:56:78:aa:bb:cc:dd:ee:ff;
    # Specific prefix for this CPE
    fixed-prefix6 2001:db8:10::/48;
}
EOF
```

## Verifying DHCPv6 Operation

```bash
# Check dhcpd is listening on DHCPv6 port
sudo ss -6 -unlp | grep :547
# udp  UNCONN  0  0  :::547  :::*  users:(("dhcpd",pid=...))

# View active DHCPv6 leases (Debian/Ubuntu path shown)
cat /var/lib/dhcp/dhcpd6.leases

# Example lease entry:
# ia-na "\000\001\000\001\256\315\357\001\252\273\314\335\356\377" {
#   cltt 7 2024/01/15 10:00:00;
#   iaaddr 2001:db8::100 {
#     binding state active;
#     next binding state free;
#     preferred-life 3000;
#     max-life 86400;
#     ends 7 2024/01/16 10:00:00;
#   }
# }

# Watch for DHCPv6 requests in syslog
sudo journalctl -f | grep dhcpd

# Capture DHCPv6 traffic
sudo tcpdump -i eth1 -v "udp port 547"
# SOLICIT, ADVERTISE, REQUEST, REPLY messages visible
```

## Troubleshooting

```bash
# Test configuration syntax
sudo dhcpd -6 -cf /etc/dhcp/dhcpd6.conf -t
# Reports syntax errors if present and exits without opening network sockets

# Common issues:

# Issue 1: "No subnet6 declaration for interface eth1"
# Fix: Add subnet6 block matching the interface's IPv6 prefix

# Issue 2: Client not getting address
# Check: Is the interface's IPv6 address in the subnet6 range?
# ip -6 addr show eth1
# Must match the subnet6 prefix in dhcpd6.conf

# Issue 3: dhcpd fails to start
# Check logs:
sudo journalctl -u isc-dhcp-server6

# Issue 4: Client in different subnet (relay needed)
# Configure DHCP relay on the router connecting client subnet to server
# (see DHCPv6 relay agent guide)
```

## Conclusion

ISC dhcpd supports DHCPv6 via `dhcpd -6` and can use a separate `dhcpd6.conf` configuration file. Key configuration elements are `subnet6` (subnet definition), `range6` (dynamic address pool), and `host` with `fixed-address6` for reservations. Host reservations use DHCPv6 DUID for identification. Stateless DHCPv6 is configured by omitting the `range6` statement. While ISC dhcpd is still widely used, it is end-of-life, so prefer Kea for new deployments because it offers better performance, REST API management, and active development.
