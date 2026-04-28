# How to Configure Network Teaming with teamd on Linux

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Network Teaming, Teamd, Linux, RHEL, nmcli, Link Aggregation, Redundancy, IPv4

Description: Learn how to configure network teaming on Linux using teamd as a modern alternative to bonding, with active-backup and LACP runner configurations using nmcli.

---

Network teaming (teamd) is the modern alternative to bonding on RHEL/CentOS. It uses a JSON-based runner configuration and is managed via `teamd` or `nmcli`.

## Installing teamd

```bash
# RHEL/CentOS

dnf install teamd NetworkManager-team -y

# Verify
teamd --version
```

## Creating a Team Interface with nmcli (Active-Backup)

```bash
# Create team interface
nmcli connection add type team \
  ifname team0 \
  con-name team0 \
  team.config '{"runner": {"name": "activebackup"}, "link_watch": {"name": "ethtool"}}'

# Add port interfaces
nmcli connection add type ethernet \
  ifname eth0 \
  con-name team0-port1 \
  master team0

nmcli connection add type ethernet \
  ifname eth1 \
  con-name team0-port2 \
  master team0

# Set static IP
nmcli connection modify team0 \
  ipv4.method manual \
  ipv4.addresses 10.0.0.10/24 \
  ipv4.gateway 10.0.0.1

# Activate
nmcli connection up team0
```

## LACP (802.3ad) Team Configuration

```bash
nmcli connection add type team \
  ifname team0 \
  con-name team0-lacp \
  team.config '{
    "runner": {
      "name": "lacp",
      "active": true,
      "fast_rate": true,
      "tx_hash": ["eth", "ip", "l4"]
    },
    "link_watch": {"name": "ethtool"}
  }'
```

## Viewing Team Status

```bash
# Show team state
teamdctl team0 state

# Output:
# setup:
#   runner: activebackup
# ports:
#   eth0
#     link watches:
#       link summary: up
#       instance[link_watch_0]:
#         name: ethtool
#         up: true
#   eth1
#     link watches:
#       link summary: up

# Show active port
teamdctl team0 state item get runner.active_port

# JSON state
teamdctl team0 state dump
```

## ARP-Based Link Watch

```bash
# Use ARP link watch for network-layer failure detection
nmcli connection modify team0 \
  team.config '{
    "runner": {"name": "activebackup"},
    "link_watch": {
      "name": "arp_ping",
      "interval": 1000,
      "missed_max": 3,
      "target_host": "10.0.0.1"
    }
  }'
```

## Troubleshooting

```bash
# Check NetworkManager journal for team events
journalctl -u NetworkManager | grep team

# List team ports
ip link show master team0

# Force port down for testing
ip link set eth0 down
teamdctl team0 state | grep "active port"
```

## Key Takeaways

- teamd uses JSON runner configurations; `activebackup` is equivalent to bonding's active-backup mode.
- Use `teamdctl team0 state` to view real-time team status and active port.
- LACP (`runner: lacp`) requires switch-side LACP configuration (LACP/802.3ad on the port-channel).
- ARP link watch detects network failures beyond the physical link; set `target_host` to the gateway IP.
