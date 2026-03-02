# How to Set Up ISC Kea DHCP Server on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, DHCP, Kea, Networking, ISC

Description: Install and configure ISC Kea DHCP server on Ubuntu as a modern replacement for ISC DHCP, covering subnet configuration, lease management, and REST API access.

---

ISC Kea is the modern successor to the long-standing ISC DHCP server (dhcpd). While ISC DHCP is still functional, it's been placed in maintenance mode with no new features being developed. Kea brings a completely redesigned architecture with JSON configuration, a REST API, a database backend for lease storage, and better support for IPv6 and DHCPv4-over-DHCPv6.

This tutorial covers installing Kea on Ubuntu and configuring it as a DHCP server for an IPv4 network.

## Installing ISC Kea

ISC Kea is available from the Ubuntu repositories, though the version may lag behind the latest. For the most current release, use the ISC package repository.

### Installing from Ubuntu Repositories

```bash
sudo apt update
sudo apt install -y kea-dhcp4-server kea-admin kea-common
```

### Installing from ISC Repository (Newer Versions)

```bash
# Add the ISC repository
curl -1sLf 'https://dl.cloudsmith.io/public/isc/kea-2-4/setup.deb.sh' | sudo bash

# Install the packages
sudo apt install -y isc-kea-dhcp4-server isc-kea-admin isc-kea-common
```

Check the installed version:

```bash
kea-dhcp4 -v
```

## Configuration Overview

Kea uses JSON configuration files instead of the ISC DHCP syntax. The main configuration file for the DHCPv4 server is `/etc/kea/kea-dhcp4.conf`. The JSON format is more verbose but also more structured and easier to parse programmatically.

## Basic Configuration

Start with a basic configuration for a single subnet:

```bash
sudo nano /etc/kea/kea-dhcp4.conf
```

```json
{
  "Dhcp4": {
    "interfaces-config": {
      "interfaces": ["eth0"],
      "dhcp-socket-type": "raw"
    },

    "lease-database": {
      "type": "memfile",
      "persist": true,
      "name": "/var/lib/kea/dhcp4.leases",
      "lfc-interval": 3600
    },

    "expired-leases-processing": {
      "reclaim-timer-wait-time": 10,
      "flush-reclaimed-timer-wait-time": 25,
      "hold-reclaimed-time": 3600,
      "max-reclaim-leases": 100,
      "max-reclaim-time": 250,
      "unwarned-reclaim-cycles": 5
    },

    "renew-timer": 900,
    "rebind-timer": 1800,
    "valid-lifetime": 3600,

    "option-data": [
      {
        "name": "domain-name-servers",
        "data": "192.168.1.10, 8.8.8.8"
      },
      {
        "name": "domain-search",
        "data": "local.example.com"
      }
    ],

    "subnet4": [
      {
        "subnet": "192.168.1.0/24",
        "id": 1,

        "pools": [
          {
            "pool": "192.168.1.100 - 192.168.1.200"
          }
        ],

        "option-data": [
          {
            "name": "routers",
            "data": "192.168.1.1"
          },
          {
            "name": "domain-name-servers",
            "data": "192.168.1.10, 192.168.1.20"
          },
          {
            "name": "broadcast-address",
            "data": "192.168.1.255"
          }
        ]
      }
    ],

    "loggers": [
      {
        "name": "kea-dhcp4",
        "output_options": [
          {
            "output": "/var/log/kea/kea-dhcp4.log",
            "maxsize": 204800,
            "maxver": 4
          }
        ],
        "severity": "INFO"
      }
    ]
  }
}
```

## Setting Up the Lease Database

Kea supports multiple backends for storing DHCP leases:

- `memfile`: Simple flat file (good for small deployments)
- `mysql`: MySQL/MariaDB database
- `postgresql`: PostgreSQL database

For small deployments, memfile is sufficient. For larger setups needing high availability or reporting, use a database backend.

Create the lease directory:

```bash
sudo mkdir -p /var/lib/kea
sudo chown kea:kea /var/lib/kea

# Create the log directory
sudo mkdir -p /var/log/kea
sudo chown kea:kea /var/log/kea
```

For a MySQL backend setup:

```bash
# Install the MySQL connector
sudo apt install -y isc-kea-dhcp4-server isc-kea-admin mysql-server

# Create the Kea database
sudo mysql -u root <<EOF
CREATE DATABASE kea;
CREATE USER 'kea'@'localhost' IDENTIFIED BY 'keapassword';
GRANT ALL PRIVILEGES ON kea.* TO 'kea'@'localhost';
FLUSH PRIVILEGES;
EOF

# Initialize the Kea schema
kea-admin db-init mysql -u kea -p keapassword -n kea
```

Update the configuration to use MySQL:

```json
"lease-database": {
  "type": "mysql",
  "host": "localhost",
  "name": "kea",
  "user": "kea",
  "password": "keapassword"
},
```

## Validating the Configuration

```bash
# Validate the JSON configuration
kea-dhcp4 -t /etc/kea/kea-dhcp4.conf
```

If the configuration is valid, you'll see `Configuration check successful`.

## Starting Kea DHCP4

```bash
sudo systemctl start kea-dhcp4-server
sudo systemctl enable kea-dhcp4-server
sudo systemctl status kea-dhcp4-server
```

Watch the logs to confirm it's working:

```bash
sudo tail -f /var/log/kea/kea-dhcp4.log
```

## Enabling the REST API (Control Agent)

One of Kea's major advantages over ISC DHCP is its REST API, which allows you to query and manage the server without restarting it. The control agent is a separate process:

```bash
sudo apt install -y isc-kea-ctrl-agent
```

Configure the control agent:

```bash
sudo nano /etc/kea/kea-ctrl-agent.conf
```

```json
{
  "Control-agent": {
    "http-host": "127.0.0.1",
    "http-port": 8000,

    "control-sockets": {
      "dhcp4": {
        "socket-type": "unix",
        "socket-name": "/var/run/kea/kea4-ctrl-socket"
      }
    },

    "loggers": [
      {
        "name": "kea-ctrl-agent",
        "output_options": [
          {
            "output": "/var/log/kea/kea-ctrl-agent.log"
          }
        ],
        "severity": "INFO"
      }
    ]
  }
}
```

Enable the Unix control socket in the DHCPv4 configuration by adding to `Dhcp4`:

```json
"control-socket": {
  "socket-type": "unix",
  "socket-name": "/var/run/kea/kea4-ctrl-socket"
},
```

Start the control agent:

```bash
sudo systemctl start kea-ctrl-agent
sudo systemctl enable kea-ctrl-agent
```

### Using the REST API

```bash
# Get the current server version
curl -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{"command": "version-get", "service": ["dhcp4"]}'

# List all active leases
curl -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{"command": "lease4-get-all", "service": ["dhcp4"]}'

# Get a specific lease by IP
curl -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{
    "command": "lease4-get",
    "service": ["dhcp4"],
    "arguments": {"ip-address": "192.168.1.100"}
  }'

# Get server statistics
curl -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{"command": "statistic-get-all", "service": ["dhcp4"]}'
```

## Adding a Second Subnet

For networks with multiple subnets, add additional subnet entries:

```json
"subnet4": [
  {
    "subnet": "192.168.1.0/24",
    "id": 1,
    "pools": [{"pool": "192.168.1.100 - 192.168.1.200"}],
    "option-data": [
      {"name": "routers", "data": "192.168.1.1"}
    ]
  },
  {
    "subnet": "10.10.0.0/24",
    "id": 2,
    "pools": [{"pool": "10.10.0.50 - 10.10.0.250"}],
    "option-data": [
      {"name": "routers", "data": "10.10.0.1"},
      {"name": "domain-name-servers", "data": "10.10.0.10"}
    ]
  }
],
```

## Checking Lease Status

View current leases from the command line:

```bash
# View the lease file directly
cat /var/lib/kea/dhcp4.leases

# Or use the API
curl -s -X POST http://127.0.0.1:8000/ \
  -H "Content-Type: application/json" \
  -d '{"command": "lease4-get-all", "service": ["dhcp4"]}' | python3 -m json.tool
```

## Firewall Configuration

```bash
# Allow DHCP traffic (UDP 67 server, 68 client)
sudo ufw allow 67/udp
sudo ufw allow 68/udp

# Allow control agent API (restrict to localhost or management network)
# The API is already on 127.0.0.1 by default, so no firewall rule needed
# If exposing to a management network:
# sudo ufw allow from 192.168.100.0/24 to any port 8000 proto tcp
```

Kea's JSON configuration and REST API make it significantly easier to automate and integrate with monitoring and orchestration tools compared to the old ISC DHCP. The database backends enable lease replication for high-availability setups, which makes Kea a much more production-ready solution for enterprise environments.
