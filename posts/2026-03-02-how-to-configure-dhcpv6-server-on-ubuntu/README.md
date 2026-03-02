# How to Configure DHCPv6 Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, Networking, DHCPv6, IPv6, ISC DHCP

Description: Configure a DHCPv6 server on Ubuntu using ISC DHCP and Kea DHCP, covering stateful and stateless DHCPv6, prefix delegation, and integration with radvd.

---

DHCPv6 handles IPv6 address assignment in networks where manual configuration or SLAAC alone isn't sufficient. It's commonly used when you need centralized control over address assignments, need to distribute additional options like DNS servers or NTP servers, or need to delegate IPv6 prefixes to downstream routers. Unlike DHCPv4, DHCPv6 often works alongside router advertisements rather than replacing them.

## DHCPv6 vs SLAAC

Understanding when to use DHCPv6 versus SLAAC (Stateless Address Autoconfiguration):

- **SLAAC only**: Simple networks where hosts generate their own addresses from router prefix announcements. No server needed.
- **Stateless DHCPv6**: Router advertisements handle address assignment (SLAAC), but DHCPv6 distributes additional configuration (DNS servers, NTP, etc.).
- **Stateful DHCPv6**: DHCPv6 assigns both addresses and configuration. Requires tracking address leases server-side.

## Installing the DHCPv6 Server

Ubuntu offers two main DHCPv6 servers: ISC DHCP (isc-dhcp-server) and Kea (isc-kea). Kea is the modern replacement actively developed by ISC.

```bash
# Install ISC DHCP server (older but widely documented)
sudo apt update
sudo apt install isc-dhcp-server -y

# Or install Kea (modern replacement)
sudo apt install kea-dhcp6-server -y

# Check which is running
systemctl status isc-dhcp-server6
systemctl status kea-dhcp6-server
```

## Configuring ISC DHCP for DHCPv6

### Basic Stateful DHCPv6 Configuration

```bash
# Configure ISC DHCP for IPv6
sudo nano /etc/dhcp/dhcpd6.conf
```

```conf
# /etc/dhcp/dhcpd6.conf - Basic stateful DHCPv6

# Lease time settings
default-lease-time 86400;    # 24 hours
max-lease-time 172800;       # 48 hours

# Log facility
log-facility local7;

# DHCPv6 subnet declaration
# Must match an address on the server interface
subnet6 2001:db8:1234:1::/64 {
    # Address range to assign to clients
    range6 2001:db8:1234:1::100 2001:db8:1234:1::200;

    # DNS servers
    option dhcp6.name-servers 2001:4860:4860::8888, 2001:4860:4860::8844;

    # Domain search list
    option dhcp6.domain-search "example.com", "internal.example.com";

    # NTP servers (optional)
    option dhcp6.sntp-servers 2001:db8:1234:1::1;
}
```

Configure the network interface:

```bash
# Edit the defaults file to specify the interface
sudo nano /etc/default/isc-dhcp-server

# Set the IPv6 interface
INTERFACESv6="eth1"
```

Start and enable the service:

```bash
sudo systemctl enable isc-dhcp-server
sudo systemctl start isc-dhcp-server
sudo systemctl status isc-dhcp-server

# Check for errors
sudo journalctl -u isc-dhcp-server -n 50
```

### Stateless DHCPv6 (Information-Only Mode)

In stateless mode, the server provides DNS and other options but doesn't assign addresses - router advertisements handle that:

```conf
# /etc/dhcp/dhcpd6.conf - Stateless DHCPv6

# Stateless configuration - no address assignment
subnet6 2001:db8:1234:1::/64 {
    # No range6 directive = stateless mode

    # Just distribute options
    option dhcp6.name-servers 2001:4860:4860::8888, 2001:4860:4860::8844;
    option dhcp6.domain-search "example.com";
}
```

### Fixed Address Assignments

```conf
# Assign a fixed address to a specific host
host myserver {
    # Client DUID (get from client: ip -6 address show)
    host-identifier option dhcp6.client-id
      00:01:00:01:12:34:56:78:aa:bb:cc:dd:ee:ff;
    fixed-address6 2001:db8:1234:1::50;
}
```

Find a client's DUID:

```bash
# On the client machine
cat /var/lib/dhcp/dhclient6.leases | grep "dhcp6.client-id"

# Or check network manager
nmcli connection show "Wired connection 1" | grep ipv6
```

## Configuring Kea DHCPv6

Kea is the recommended modern DHCPv6 server. Its configuration uses JSON:

```bash
sudo nano /etc/kea/kea-dhcp6.conf
```

```json
{
  "Dhcp6": {
    "interfaces-config": {
      "interfaces": ["eth1"]
    },

    "lease-database": {
      "type": "memfile",
      "persist": true,
      "name": "/var/lib/kea/dhcp6.leases"
    },

    "valid-lifetime": 86400,
    "preferred-lifetime": 43200,

    "subnet6": [
      {
        "subnet": "2001:db8:1234:1::/64",
        "pools": [
          {
            "pool": "2001:db8:1234:1::100-2001:db8:1234:1::200"
          }
        ],
        "option-data": [
          {
            "name": "dns-servers",
            "data": "2001:4860:4860::8888, 2001:4860:4860::8844"
          },
          {
            "name": "domain-search",
            "data": "example.com"
          }
        ],
        "reservations": [
          {
            "duid": "01:02:03:04:05:06:07:08:09:0a:0b:0c:0d:0e:0f",
            "ip-addresses": ["2001:db8:1234:1::50"],
            "hostname": "myserver.example.com"
          }
        ]
      }
    ],

    "loggers": [
      {
        "name": "kea-dhcp6",
        "output_options": [
          {
            "output": "/var/log/kea/kea-dhcp6.log"
          }
        ],
        "severity": "INFO"
      }
    ]
  }
}
```

```bash
# Validate Kea configuration
kea-dhcp6 -t /etc/kea/kea-dhcp6.conf

# Start Kea DHCPv6
sudo systemctl enable kea-dhcp6-server
sudo systemctl start kea-dhcp6-server
sudo systemctl status kea-dhcp6-server
```

## Prefix Delegation

Prefix delegation allows the DHCPv6 server to assign a block of addresses (a prefix) to a downstream router, which then assigns addresses from that block to its clients.

```conf
# ISC DHCP prefix delegation configuration
subnet6 2001:db8:1234::/48 {
    # Assign addresses from the main subnet to the router interface
    range6 2001:db8:1234:1::1 2001:db8:1234:1::10;

    # Delegate /56 prefixes to downstream routers
    prefix6 2001:db8:1234:0100:: 2001:db8:1234:ff00:: /56;

    option dhcp6.name-servers 2001:4860:4860::8888;
}
```

In Kea:

```json
"pd-pools": [
  {
    "prefix": "2001:db8:1234:0100::",
    "prefix-len": 48,
    "delegated-len": 56
  }
]
```

## Integrating with radvd

DHCPv6 and Router Advertisement Daemon (radvd) work together. radvd sends router advertisements that tell clients to use DHCPv6 for address assignment or just for other options.

```bash
# Install radvd
sudo apt install radvd -y

# Configure radvd to work with stateful DHCPv6
sudo nano /etc/radvd.conf
```

```conf
# /etc/radvd.conf - Stateful DHCPv6 mode

interface eth1 {
    AdvSendAdvert on;
    MinRtrAdvInterval 3;
    MaxRtrAdvInterval 10;

    # Tell clients to use DHCPv6 for addresses (stateful)
    AdvManagedFlag on;

    # Tell clients to use DHCPv6 for other info (DNS, etc.)
    AdvOtherConfigFlag on;

    prefix 2001:db8:1234:1::/64 {
        AdvOnLink on;
        AdvAutonomous off;  # Disable SLAAC when using stateful DHCPv6
        AdvRouterAddr on;
    };
};
```

For stateless DHCPv6 (SLAAC + DHCPv6 options only):

```conf
interface eth1 {
    AdvSendAdvert on;

    # Don't use DHCPv6 for addresses
    AdvManagedFlag off;

    # But do use DHCPv6 for options (DNS, etc.)
    AdvOtherConfigFlag on;

    prefix 2001:db8:1234:1::/64 {
        AdvOnLink on;
        AdvAutonomous on;   # Enable SLAAC
    };
};
```

```bash
sudo systemctl enable radvd
sudo systemctl start radvd
```

## Viewing Leases

```bash
# ISC DHCP leases file
cat /var/lib/dhcp/dhcpd6.leases

# Kea leases file
cat /var/lib/kea/dhcp6.leases

# Show active DHCPv6 leases in a readable format
grep -A 10 "^lease6" /var/lib/dhcp/dhcpd6.leases | head -50
```

## Testing DHCPv6

From a client machine on the same network segment:

```bash
# Request a DHCPv6 lease (using dhclient)
sudo dhclient -6 eth0

# Check the acquired IPv6 address
ip -6 addr show eth0

# Release the lease
sudo dhclient -6 -r eth0

# Test with the wide-dhcpv6 client
sudo apt install wide-dhcpv6-client -y
sudo dhcp6c -c /etc/wide-dhcpv6/dhcp6c.conf eth0
```

## Monitoring

```bash
# Watch DHCPv6 server logs
sudo journalctl -u isc-dhcp-server -f

# For Kea
sudo tail -f /var/log/kea/kea-dhcp6.log

# Check for DHCPv6 traffic on the interface
sudo tcpdump -i eth1 -n ip6 and udp port 547
```

DHCPv6 port numbers:
- Server listens on UDP port 547
- Client listens on UDP port 546

Setting up DHCPv6 properly alongside radvd gives you the control of centralized address management while maintaining IPv6's neighbor discovery mechanisms.
