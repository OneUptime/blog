# How to Configure DHCPv6 Failover for High Availability

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: DHCPv6, IPv6, High Availability, Failover, Kea, Networking, Redundancy

Description: Learn how to configure DHCPv6 failover using Kea's High Availability (HA) hook to ensure continuous IP address assignment even when one server fails.

---

DHCPv6 failover ensures that if your primary DHCP server goes offline, a secondary server continues to serve address assignments. Kea does not implement the DHCPv6 failover protocol from RFC 8156; instead, it provides high availability through its built-in High Availability (HA) hook library.

---

## Failover Architecture

```text
Clients
   |
   ├─── Primary DHCPv6 Server (active)
   │         ↕  lease sync (RESTful API)
   └─── Standby DHCPv6 Server (hot-standby)
```

In **hot-standby** mode, the primary handles all requests. The standby does not answer DHCP queries during normal operation; it receives lease updates over the API and begins responding if the primary is considered offline.

---

## Prerequisites

- Two Linux servers with Kea DHCPv6 installed
- Network reachability between both servers on the HA/control API port (8000 in this example)
- Matching `subnet6` and pool configuration on both servers, plus a local control socket for `kea-dhcp6`

### Install Kea

```bash
sudo apt-get install kea-dhcp6-server kea-ctrl-agent
```

---

## Configuring Primary Server

### kea-dhcp6.conf (Primary)

```json
{
  "Dhcp6": {
    "interfaces-config": {
      "interfaces": ["eth0"]
    },
    "control-socket": {
      "socket-type": "unix",
      "socket-name": "kea6-ctrl-socket"
    },
    "lease-database": {
      "type": "memfile",
      "lfc-interval": 3600,
      "name": "dhcp6.leases"
    },
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
                  "url": "http://192.168.1.10:8000/",
                  "role": "primary",
                  "auto-failover": true
                },
                {
                  "name": "server2",
                  "url": "http://192.168.1.11:8000/",
                  "role": "standby",
                  "auto-failover": true
                }
              ]
            }
          ]
        }
      }
    ],
    "subnet6": [
      {
        "subnet": "2001:db8::/32",
        "pools": [
          { "pool": "2001:db8::100-2001:db8::500" }
        ],
        "option-data": [
          { "name": "dns-servers", "data": "2001:db8::1" }
        ]
      }
    ]
  }
}
```

---

## Configuring Standby Server

The standby configuration is identical except `this-server-name` is `server2`.

```json
{
  "Dhcp6": {
    "interfaces-config": {
      "interfaces": ["eth0"]
    },
    "control-socket": {
      "socket-type": "unix",
      "socket-name": "kea6-ctrl-socket"
    },
    "lease-database": {
      "type": "memfile",
      "lfc-interval": 3600,
      "name": "dhcp6.leases"
    },
    "hooks-libraries": [
      {
        "library": "/usr/lib/x86_64-linux-gnu/kea/hooks/libdhcp_lease_cmds.so"
      },
      {
        "library": "/usr/lib/x86_64-linux-gnu/kea/hooks/libdhcp_ha.so",
        "parameters": {
          "high-availability": [
            {
              "this-server-name": "server2",
              "mode": "hot-standby",
              "heartbeat-delay": 10000,
              "max-response-delay": 60000,
              "max-ack-delay": 5000,
              "max-unacked-clients": 5,
              "peers": [
                {
                  "name": "server1",
                  "url": "http://192.168.1.10:8000/",
                  "role": "primary",
                  "auto-failover": true
                },
                {
                  "name": "server2",
                  "url": "http://192.168.1.11:8000/",
                  "role": "standby",
                  "auto-failover": true
                }
              ]
            }
          ]
        }
      }
    ],
    "subnet6": [
      {
        "subnet": "2001:db8::/32",
        "pools": [
          { "pool": "2001:db8::100-2001:db8::500" }
        ],
        "option-data": [
          { "name": "dns-servers", "data": "2001:db8::1" }
        ]
      }
    ]
  }
}
```

---

## Configuring the Kea Control Agent

The control agent exposes the REST API used for HA communication and forwards commands to the local DHCPv6 server over its UNIX control socket.

```json
{
  "Control-agent": {
    "http-host": "0.0.0.0",
    "http-port": 8000,
    "control-sockets": {
      "dhcp6": {
        "socket-type": "unix",
        "socket-name": "kea6-ctrl-socket"
      }
    }
  }
}
```

```bash
sudo systemctl enable kea-ctrl-agent
sudo systemctl start kea-ctrl-agent
```

---

## Starting and Verifying

```bash
# Start on both servers

sudo systemctl enable kea-dhcp6-server
sudo systemctl start kea-dhcp6-server

# Check HA state via API
curl -s -X POST http://localhost:8000/ \
  -H "Content-Type: application/json" \
  -d '{"command":"ha-heartbeat","service":["dhcp6"]}' | python3 -m json.tool

# Expected response shows a "state" such as "hot-standby" when the HA pair is healthy
```

---

## Testing Failover

```bash
# 1. Verify primary is serving leases
tcpdump -ni eth0 'udp port 546 or udp port 547'

# 2. Stop primary
sudo systemctl stop kea-dhcp6-server  # on server1

# 3. Watch standby promote itself
journalctl -u kea-dhcp6-server -f  # on server2
# Should show a transition to partner-down after the HA failure-detection thresholds are met

# 4. Verify clients still receive leases
```

---

## HA Modes Comparison

| Mode | Description | Use Case |
|------|-------------|----------|
| hot-standby | Primary active, standby passive | Most common, simple failover |
| load-balancing | Both serve different ranges | High throughput environments |
| passive-backup | Primary active, backup receives copies | Disaster recovery |

---

## Best Practices

1. **Keep `subnet6` and pool definitions identical on both nodes** - the HA hook synchronizes leases between the paired servers
2. **Monitor heartbeat delays** - set `max-response-delay` based on your network latency
3. **Test failover regularly** - simulate primary failure in maintenance windows
4. **Use the Kea Stork** management UI for visual HA status monitoring
5. **Place servers in separate racks/zones** to protect against hardware failures

---

## Conclusion

Kea's High Availability hook provides robust DHCPv6 failover with minimal configuration. In hot-standby mode, your standby server automatically takes over after the configured HA failure-detection thresholds are met, ensuring continuous IPv6 address assignment for your network.

---

*Monitor your DHCPv6 and network infrastructure with [OneUptime](https://oneuptime.com) - real-time uptime tracking with alerting.*
