# How to Configure DHCP for Multiple VLANs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCP, VLAN, Networking, Multi-VLAN, Sysadmin

Description: Configuring DHCP for multiple VLANs requires either multiple DHCP servers or relay agents that forward requests to a single centralized server, with one scope per VLAN subnet.

## Architecture Options

| Approach | Pros | Cons |
|----------|------|------|
| One server + relay agents | Centralized management | Relay agent required per VLAN |
| One server per VLAN | No relay needed | Many servers to manage |
| DHCP on router/switch | Built-in | Limited features |

## ISC dhcpd: Multi-VLAN Configuration

ISC DHCP is end-of-life, so use this example for existing deployments and prefer Kea for new ones.

Each served VLAN subnet needs a `subnet` declaration, and ISC DHCP also needs one for the subnet the server is directly connected to:

```text
# /etc/dhcp/dhcpd.conf

# Global defaults

option domain-name "corp.example.com";
default-lease-time 86400;

# Server-facing / management network
# Required because dhcpd is directly connected here, even though it is not
# handing out leases on this subnet.
subnet 10.0.0.0 netmask 255.255.255.0 {
}

# VLAN 10 - Servers
subnet 10.0.10.0 netmask 255.255.255.0 {
    range 10.0.10.50 10.0.10.200;
    option routers 10.0.10.1;
    option domain-name-servers 10.0.0.53;
    default-lease-time 604800;    # Servers: 7-day leases
}

# VLAN 20 - Users
subnet 10.0.20.0 netmask 255.255.255.0 {
    range 10.0.20.50 10.0.20.240;
    option routers 10.0.20.1;
    option domain-name-servers 10.0.0.53;
    default-lease-time 86400;     # Users: 1-day leases
}

# VLAN 30 - VoIP
subnet 10.0.30.0 netmask 255.255.255.0 {
    range 10.0.30.10 10.0.30.250;
    option routers 10.0.30.1;
    option domain-name-servers 10.0.0.53;
    option tftp-server-name "10.0.0.100";
    default-lease-time 3600;      # VoIP: 1-hour leases
}

# VLAN 99 - Guest
subnet 10.0.99.0 netmask 255.255.255.0 {
    range 10.0.99.10 10.0.99.250;
    option routers 10.0.99.1;
    option domain-name-servers 8.8.8.8;
    default-lease-time 1800;      # Guests: 30-min leases
}
```

## Setting Up Relay Agents on a Linux Router

```bash
# eth0 = server-facing uplink, eth0.10/20/30/99 = VLAN sub-interfaces
# DHCP server at 10.0.0.53

# Start dhcrelay for all VLAN interfaces and accept server replies on eth0
sudo dhcrelay -i eth0.10 -i eth0.20 -i eth0.30 -i eth0.99 -iu eth0 10.0.0.53

# Debian/Ubuntu packaged service with interface list
sudo tee /etc/default/isc-dhcp-relay << 'EOF'
SERVERS="10.0.0.53"
INTERFACES="eth0.10 eth0.20 eth0.30 eth0.99"
OPTIONS="-iu eth0"
EOF
sudo systemctl restart isc-dhcp-relay
```

## Cisco IOS: ip helper-address per VLAN

```text
interface Vlan10
  ip address 10.0.10.1 255.255.255.0
  ip helper-address 10.0.0.53

interface Vlan20
  ip address 10.0.20.1 255.255.255.0
  ip helper-address 10.0.0.53

interface Vlan30
  ip address 10.0.30.1 255.255.255.0
  ip helper-address 10.0.0.53
```

## Verifying Multi-VLAN DHCP

```bash
# Debian/Ubuntu packaged service: for relayed VLANs, bind dhcpd to the
# server-facing interface rather than the client VLAN sub-interfaces
sudo tee /etc/default/isc-dhcp-server << 'EOF'
INTERFACESv4="eth0"
EOF

sudo systemctl restart isc-dhcp-server

# Test from each VLAN - check which subnet is assigned
journalctl -u isc-dhcp-server | grep "DHCPACK"
```

## Key Takeaways

- Create one `subnet` declaration per served VLAN in dhcpd.conf, plus one for any directly connected server network.
- Use relay agents (`dhcrelay` or Cisco `ip helper-address`) to forward DHCP broadcasts across VLAN boundaries.
- Bind the DHCP server to the interface(s) on which it should listen; with relay agents, this is typically the server-facing interface.
- Different VLANs can have different lease times and options (e.g., short leases for guests).
