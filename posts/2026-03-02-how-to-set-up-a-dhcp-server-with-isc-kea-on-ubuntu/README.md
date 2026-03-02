# How to Set Up a DHCP Server with isc-kea on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DHCP, Networking, isc-kea, Server

Description: Configure a DHCP server using ISC Kea on Ubuntu, including subnet configuration, static reservations, lease management, and monitoring.

---

ISC Kea is the modern replacement for ISC DHCP (dhcpd). It uses JSON-based configuration, supports REST API management, and has a more modular architecture. Ubuntu's package repositories include Kea, making it straightforward to deploy as a DHCP server for your network.

## Why Kea Instead of dhcpd?

ISC DHCP (dhcpd) reached end-of-life in 2022. Kea is the actively maintained successor with several improvements:

- JSON configuration that is easier to validate and manage
- REST API for dynamic configuration changes without restarts
- Better high-availability support
- Hooks-based extensibility
- Separate DHCPv4 and DHCPv6 daemons

## Installation

```bash
sudo apt update
sudo apt install kea-dhcp4-server kea-dhcp6-server kea-admin kea-common
```

This installs the DHCPv4 server, DHCPv6 server, admin utilities, and common libraries. For most setups you only need DHCPv4:

```bash
sudo apt install kea-dhcp4-server
```

Check the installed version:

```bash
kea-dhcp4 -V
```

## Configuration File Structure

The main DHCPv4 configuration file is `/etc/kea/kea-dhcp4.conf`. It is JSON format with a specific structure:

```json
{
  "Dhcp4": {
    "interfaces-config": { ... },
    "lease-database": { ... },
    "subnet4": [ ... ],
    "option-data": [ ... ],
    "loggers": [ ... ]
  }
}
```

## Basic DHCPv4 Configuration

Here is a working configuration for a simple network:

```json
// /etc/kea/kea-dhcp4.conf
{
  "Dhcp4": {
    // Listen on this interface
    "interfaces-config": {
      "interfaces": ["eth0"],
      "dhcp-socket-type": "raw"
    },

    // Use memfile for lease storage (simple file-based storage)
    "lease-database": {
      "type": "memfile",
      "persist": true,
      "name": "/var/lib/kea/kea-leases4.csv",
      "lfc-interval": 3600
    },

    // Global default lease times (in seconds)
    "valid-lifetime": 86400,
    "min-valid-lifetime": 3600,
    "max-valid-lifetime": 172800,

    // Global DHCP options sent to all clients
    "option-data": [
      {
        "name": "domain-name-servers",
        "data": "9.9.9.9, 149.112.112.112"
      },
      {
        "name": "domain-name",
        "data": "example.com"
      },
      {
        "name": "domain-search",
        "data": "example.com, corp.example.com"
      }
    ],

    // Subnet definitions
    "subnet4": [
      {
        "subnet": "192.168.1.0/24",
        "id": 1,

        // Address pool - range of IPs to assign dynamically
        "pools": [
          {
            "pool": "192.168.1.100 - 192.168.1.200"
          }
        ],

        // Subnet-specific options (override global options)
        "option-data": [
          {
            "name": "routers",
            "data": "192.168.1.1"
          },
          {
            "name": "broadcast-address",
            "data": "192.168.1.255"
          }
        ]
      }
    ],

    // Logging configuration
    "loggers": [
      {
        "name": "kea-dhcp4",
        "output_options": [
          {
            "output": "/var/log/kea/kea-dhcp4.log"
          }
        ],
        "severity": "INFO",
        "debuglevel": 0
      }
    ]
  }
}
```

Create the log directory:

```bash
sudo mkdir -p /var/log/kea
sudo chown kea:kea /var/log/kea
```

## Validating the Configuration

Before starting the service, validate the JSON configuration:

```bash
sudo kea-dhcp4 -t /etc/kea/kea-dhcp4.conf
```

If there are no errors, the output shows `Configuration check was successful`.

## Starting the DHCP Server

```bash
# Start the DHCPv4 server
sudo systemctl start kea-dhcp4-server

# Enable at boot
sudo systemctl enable kea-dhcp4-server

# Check status
sudo systemctl status kea-dhcp4-server
```

View live logs:

```bash
sudo journalctl -u kea-dhcp4-server -f
# or
sudo tail -f /var/log/kea/kea-dhcp4.log
```

## Adding Static IP Reservations

Static reservations (fixed addresses) are defined in the configuration as host reservations. You can match on MAC address, client ID, or hostname.

### Reservation by MAC Address

```json
"subnet4": [
  {
    "subnet": "192.168.1.0/24",
    "id": 1,
    "pools": [
      {"pool": "192.168.1.100 - 192.168.1.200"}
    ],
    "option-data": [
      {
        "name": "routers",
        "data": "192.168.1.1"
      }
    ],
    "reservations": [
      {
        "hw-address": "52:54:00:ab:cd:01",
        "ip-address": "192.168.1.10",
        "hostname": "webserver",
        "option-data": [
          {
            "name": "domain-name-servers",
            "data": "192.168.1.53"
          }
        ]
      },
      {
        "hw-address": "52:54:00:ab:cd:02",
        "ip-address": "192.168.1.11",
        "hostname": "dbserver"
      }
    ]
  }
]
```

Reload after changes:

```bash
sudo systemctl reload kea-dhcp4-server
```

## Multiple Subnets

For environments with multiple VLANs or network segments:

```json
"subnet4": [
  {
    "subnet": "192.168.1.0/24",
    "id": 1,
    "interface": "eth0.1",
    "pools": [{"pool": "192.168.1.100 - 192.168.1.200"}],
    "option-data": [
      {"name": "routers", "data": "192.168.1.1"},
      {"name": "domain-name-servers", "data": "9.9.9.9"}
    ]
  },
  {
    "subnet": "192.168.10.0/24",
    "id": 2,
    "interface": "eth0.10",
    "pools": [{"pool": "192.168.10.50 - 192.168.10.150"}],
    "option-data": [
      {"name": "routers", "data": "192.168.10.1"},
      {"name": "domain-name-servers", "data": "192.168.10.53"}
    ]
  }
]
```

## Managing Leases

### Viewing Current Leases

The lease file is at `/var/lib/kea/kea-leases4.csv`:

```bash
# View all active leases
cat /var/lib/kea/kea-leases4.csv | column -t -s,
```

The CSV columns are: address, hwaddr, client_id, valid_lft, expire, subnet_id, fqdn_fwd, fqdn_rev, hostname, state, user_context, pool_id.

### Using kea-admin to Inspect Leases

```bash
# List all leases in the memfile
sudo kea-admin lease-dump v4 --output - memfile -l /var/lib/kea/kea-leases4.csv
```

### Removing a Specific Lease

If you need to remove a lease (for example, to force a client to get a new IP):

```bash
# Edit the lease file and remove the line for the IP address
# First, create a backup
sudo cp /var/lib/kea/kea-leases4.csv /var/lib/kea/kea-leases4.csv.backup

# Find the lease entry
grep "192.168.1.105" /var/lib/kea/kea-leases4.csv

# Remove it with sed (example - verify the line first)
sudo sed -i '/192.168.1.105,/d' /var/lib/kea/kea-leases4.csv

# Reload the server to pick up the change
sudo systemctl reload kea-dhcp4-server
```

## Enabling the REST API

Kea's REST API (the `kea-ctrl-agent`) allows dynamic configuration without restarts:

```bash
sudo apt install kea-ctrl-agent
```

Configure the control agent:

```json
// /etc/kea/kea-ctrl-agent.conf
{
  "Control-agent": {
    "http-host": "127.0.0.1",
    "http-port": 8080,
    "control-sockets": {
      "dhcp4": {
        "socket-type": "unix",
        "socket-name": "/run/kea/kea4-ctrl-socket"
      }
    }
  }
}
```

Start the control agent:

```bash
sudo systemctl enable --now kea-ctrl-agent
```

Query the API:

```bash
# List all subnets
curl -s -X POST http://127.0.0.1:8080 \
  -H "Content-Type: application/json" \
  -d '{"command": "subnet4-list", "service": ["dhcp4"]}'

# List all current leases
curl -s -X POST http://127.0.0.1:8080 \
  -H "Content-Type: application/json" \
  -d '{"command": "lease4-get-all", "service": ["dhcp4"]}'
```

## Monitoring

Check that the server is receiving and responding to DHCP traffic:

```bash
# Watch DHCP traffic on the interface
sudo tcpdump -i eth0 -n port 67 or port 68

# Check the log for DISCOVER/OFFER/REQUEST/ACK exchanges
sudo tail -f /var/log/kea/kea-dhcp4.log | grep -E "DISCOVER|OFFER|REQUEST|ACK"
```

Check server statistics:

```bash
curl -s -X POST http://127.0.0.1:8080 \
  -H "Content-Type: application/json" \
  -d '{"command": "statistic-get-all", "service": ["dhcp4"]}' | python3 -m json.tool
```

ISC Kea is a capable and actively maintained DHCP server that is well-suited for both simple and complex network environments. The JSON configuration is more readable than dhcpd's format, and the REST API adds operational flexibility that legacy DHCP servers cannot match.
