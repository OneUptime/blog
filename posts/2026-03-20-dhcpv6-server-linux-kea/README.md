# How to Configure a DHCPv6 Server with Kea on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, Kea, Linux, IPv6, DHCP Server, ISC

Description: Configure ISC Kea as a DHCPv6 server on Linux, including subnet configuration, address pools, reservations, DNS options, and prefix delegation.

## Introduction

Kea is ISC's modern DHCP server that supports DHCPv4 and DHCPv6. It is the successor to ISC dhcpd and offers a management API, database backend support (MySQL, PostgreSQL), and high-availability configurations. Kea's DHCPv6 server (`kea-dhcp6`) handles stateful address assignment, prefix delegation, and stateless DHCPv6 configuration.

## Installation

```bash
# Debian/Ubuntu

sudo apt-get install kea-dhcp6-server

# RHEL/CentOS/Fedora
sudo dnf install kea

# Verify installation
kea-dhcp6 --version
```

## Basic DHCPv6 Configuration

```json
// /etc/kea/kea-dhcp6.conf
{
  "Dhcp6": {
    "interfaces-config": {
      "interfaces": ["eth1"]
    },

    "lease-database": {
      "type": "memfile",
      "name": "/var/lib/kea/dhcp6.leases"
    },

    "preferred-lifetime": 3000,
    "valid-lifetime": 4000,
    "renew-timer": 1000,
    "rebind-timer": 2000,

    "option-data": [
      {
        "name": "dns-servers",
        "data": "2001:4860:4860::8888, 2001:4860:4860::8844"
      },
      {
        "name": "domain-search",
        "data": "corp.example.com, example.com"
      }
    ],

    "subnet6": [
      {
        "id": 1,
        "subnet": "2001:db8::/64",
        "interface": "eth1",
        "pools": [
          {
            "pool": "2001:db8::100 - 2001:db8::200"
          }
        ],
        "option-data": [
          {
            "name": "dns-servers",
            "data": "2001:db8::53"
          }
        ]
      }
    ]
  }
}
```

## Adding Address Reservations

```json
// Add to the subnet6 block in kea-dhcp6.conf
{
  "Dhcp6": {
    "subnet6": [
      {
        "id": 1,
        "subnet": "2001:db8::/64",
        "pools": [
          { "pool": "2001:db8::100 - 2001:db8::200" }
        ],
        "reservations": [
          {
            "duid": "00:01:00:01:ab:cd:ef:01:aa:bb:cc:dd:ee:ff",
            "ip-addresses": ["2001:db8::10"],
            "hostname": "server1.example.com",
            "option-data": [
              {
                "name": "dns-servers",
                "data": "2001:db8::53"
              }
            ]
          },
          {
            "hw-address": "aa:bb:cc:dd:ee:ff",
            "ip-addresses": ["2001:db8::20"],
            "hostname": "server2.example.com"
          }
        ]
      }
    ]
  }
}
```

## Prefix Delegation Configuration

```json
// Add prefix delegation pool to subnet6
{
  "Dhcp6": {
    "subnet6": [
      {
        "id": 1,
        "subnet": "2001:db8::/32",
        "pd-pools": [
          {
            "prefix": "2001:db8::",
            "prefix-len": 32,
            "delegated-len": 56
          }
        ]
      }
    ]
  }
}
```

## Starting and Verifying Kea

```bash
# Validate configuration
sudo kea-dhcp6 -t /etc/kea/kea-dhcp6.conf
# Exit status 0 means the configuration parsed successfully

# Start Kea DHCPv6
# Debian/Ubuntu
sudo systemctl start kea-dhcp6-server
sudo systemctl enable kea-dhcp6-server
# RHEL/CentOS/Fedora
# sudo systemctl start kea-dhcp6
# sudo systemctl enable kea-dhcp6

# Check status
# Debian/Ubuntu
sudo systemctl status kea-dhcp6-server
# RHEL/CentOS/Fedora
# sudo systemctl status kea-dhcp6

# View active leases
cat /var/lib/kea/dhcp6.leases

# Monitor DHCPv6 exchanges in real time
# Debian/Ubuntu
sudo journalctl -u kea-dhcp6-server -f
# RHEL/CentOS/Fedora
# sudo journalctl -u kea-dhcp6 -f

# Capture DHCPv6 traffic to verify
sudo tcpdump -i eth1 -v "udp port 547"
```

## High Availability with Kea

```json
// Kea HA configuration (add to Dhcp6 block)
// Hook library paths vary by distribution.
{
  "Dhcp6": {
    "hooks-libraries": [
      {
        "library": "/usr/lib/x86_64-linux-gnu/kea/hooks/libdhcp_lease_cmds.so"
      },
      {
        "library": "/usr/lib/x86_64-linux-gnu/kea/hooks/libdhcp_ha.so",
        "parameters": {
          "high-availability": [
            {
              "this-server-name": "server1",
              "mode": "hot-standby",
              "heartbeat-delay": 10000,
              "max-response-delay": 60000,
              "max-ack-delay": 5000,
              "max-unacked-clients": 5,
              "peers": [
                {
                  "name": "server1",
                  "url": "http://192.168.1.1:8000/",
                  "role": "primary",
                  "auto-failover": true
                },
                {
                  "name": "server2",
                  "url": "http://192.168.1.2:8000/",
                  "role": "standby",
                  "auto-failover": true
                }
              ]
            }
          ]
        }
      }
    ]
  }
}
```

## Conclusion

Kea is the modern choice for DHCPv6 server deployment on Linux. Configuration is JSON-based and supports address pools, reservations by DUID or MAC, prefix delegation, and high availability. Key configuration elements are `subnet6` (defines the subnet), `pools` (address ranges), `reservations` (static assignments), and `option-data` (DNS, domain, etc.). Validate configuration with `kea-dhcp6 -t` before restarting. Monitor leases with the lease file or a configured management API. For production deployments that need SQL-backed lease storage, database-backed host reservations, or the configuration backend, use a database backend (MySQL/PostgreSQL) instead of memfile.
